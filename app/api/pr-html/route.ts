export const revalidate = 3600;

const PR_RE = /^https:\/\/github\.com\/[^\/]+\/[^\/]+\/pull\/\d+\/?$/;
const MAX_BYTES = 1572864; // 1.5 MB
const TIMEOUT_MS = 8000;

function buildFallbackHtml(originalUrl: string): string {
  const escaped = originalUrl
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  return `<!doctype html><html><head><meta charset="utf-8"><base href="https://github.com/" target="_blank"><style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#fff;color:#111}main{max-width:480px;padding:24px;text-align:center}a{color:#0969da;text-decoration:underline}</style></head><body><main><p>Unable to load pull request.</p><p><a href="${escaped}" target="_blank" rel="noopener noreferrer">Open on GitHub</a></p></main></body></html>`;
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");

  if (!rawUrl || !PR_RE.test(rawUrl)) {
    return new Response("Invalid or missing url", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  try {
    const res = await fetch(rawUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: 3600 },
    });

    if (!res.ok) throw new Error(`upstream ${res.status}`);

    const contentLength = res.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_BYTES) {
      throw new Error("too large");
    }

    let html = await res.text();

    if (new TextEncoder().encode(html).length > MAX_BYTES) {
      throw new Error("too large");
    }

    // Loop-resolve every <include-fragment> server-side
    const FRAGMENT_RE =
      /<include-fragment\b[^>]*\bsrc="([^"]+)"[^>]*>[\s\S]*?<\/include-fragment>/i;
    let processed = html;
    let iterations = 0;
    while (iterations < 10) {
      const match = processed.match(FRAGMENT_RE);
      if (!match) break;
      const full = match[0];
      const srcAttr = match[1].replaceAll("&amp;", "&");
      let srcUrl: URL;
      try {
        srcUrl = new URL(srcAttr, "https://github.com/");
      } catch {
        processed = processed.replace(full, "");
        iterations++;
        continue;
      }
      if (srcUrl.origin !== "https://github.com") {
        processed = processed.replace(full, "");
        iterations++;
        continue;
      }
      try {
        const fragRes = await fetch(srcUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0",
            "X-Requested-With": "XMLHttpRequest",
          },
          signal: AbortSignal.timeout(TIMEOUT_MS),
          next: { revalidate: 3600 },
        });
        if (fragRes.ok) {
          const fragHtml = await fragRes.text();
          // cap fragment as well
          if (new TextEncoder().encode(fragHtml).length <= MAX_BYTES) {
            processed = processed.replace(full, fragHtml);
          } else {
            processed = processed.replace(full, "");
          }
        } else {
          processed = processed.replace(full, "");
        }
      } catch {
        processed = processed.replace(full, "");
      }
      iterations++;
    }
    html = processed;

    // Strip all scripts — GitHub bundle would boot React and fire
    // same-origin requests that resolve against this site.
    html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
    html = html.replace(/<script\b[^>]*\/?>/gi, "");

    // Resolve every remaining relative URL against github.com
    if (/<head(\s[^>]*)?>/i.test(html)) {
      html = html.replace(
        /<head(\s[^>]*)?>/i,
        `$&<base href="https://github.com/" target="_blank">`,
      );
    } else {
      html = `<base href="https://github.com/" target="_blank">` + html;
    }

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    const fallback = buildFallbackHtml(rawUrl);
    return new Response(fallback, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  }
}
