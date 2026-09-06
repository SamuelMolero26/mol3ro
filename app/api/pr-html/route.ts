import {
  NO_STORE_CACHE_CONTROL,
  SUCCESS_CACHE_CONTROL,
  createUpstreamDeadline,
  fetchUpstreamText,
} from "@/lib/upstream";

export const dynamic = "force-dynamic";

const GITHUB_ORIGIN = "https://github.com";
const PR_PATH_RE = /^\/[^/]+\/[^/]+\/pull\/\d+\/?$/;
const ROUTE_DEADLINE_MS = 8000;
const MAX_HTML_BYTES = 1572864;
const MAX_FRAGMENT_BYTES = 131072;
const MAX_FRAGMENT_TOTAL_BYTES = 262144;
const MAX_FRAGMENT_FETCHES = 2;
const MAX_OUTPUT_BYTES = MAX_HTML_BYTES + MAX_FRAGMENT_TOTAL_BYTES;

const HTML_HEADERS = { "User-Agent": "Mozilla/5.0" };
const FRAGMENT_RE =
  /<include-fragment\b[^>]*\bsrc="([^"]+)"[^>]*>[\s\S]*?<\/include-fragment>/gi;

function parsePullRequestUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.origin === GITHUB_ORIGIN &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      PR_PATH_RE.test(url.pathname)
      ? url
      : null;
  } catch {
    return null;
  }
}

function isAllowedPresentationFragment(url: URL, pullRequestUrl: URL): boolean {
  const expectedPath = `${pullRequestUrl.pathname.replace(/\/$/, "")}/partials/links`;
  const hasIssues = url.searchParams.get("has_github_issues");
  return (
    url.origin === GITHUB_ORIGIN &&
    url.pathname === expectedPath &&
    (hasIssues === null || hasIssues === "true" || hasIssues === "false") &&
    [...url.searchParams.keys()].every((key) => key === "has_github_issues")
  );
}

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
  const pullRequestUrl = rawUrl ? parsePullRequestUrl(rawUrl) : null;

  if (!rawUrl || !pullRequestUrl) {
    return new Response("Invalid or missing url", {
      status: 400,
      headers: {
        "Cache-Control": NO_STORE_CACHE_CONTROL,
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  const deadline = createUpstreamDeadline(ROUTE_DEADLINE_MS);

  try {
    const upstream = await fetchUpstreamText(pullRequestUrl, {
      headers: HTML_HEADERS,
      maxBytes: MAX_HTML_BYTES,
      signal: deadline.signal,
    });
    let html = upstream.text;
    let fragmentBytes = 0;
    let fragmentFetches = 0;
    let cacheControl = SUCCESS_CACHE_CONTROL;

    // Resolve only presentation-safe fragments. GitHub's edit forms are
    // deliberately removed without issuing upstream requests.
    for (const match of upstream.text.matchAll(FRAGMENT_RE)) {
      const full = match[0];
      let replacement = "";
      try {
        const srcUrl = new URL(
          match[1].replaceAll("&amp;", "&"),
          `${GITHUB_ORIGIN}/`,
        );
        if (!isAllowedPresentationFragment(srcUrl, pullRequestUrl)) {
          html = html.replace(full, () => replacement);
          continue;
        }

        const remainingBytes = MAX_FRAGMENT_TOTAL_BYTES - fragmentBytes;
        if (fragmentFetches >= MAX_FRAGMENT_FETCHES || remainingBytes <= 0) {
          cacheControl = NO_STORE_CACHE_CONTROL;
          html = html.replace(full, () => replacement);
          continue;
        }

        fragmentFetches += 1;
        const fragment = await fetchUpstreamText(srcUrl, {
          headers: {
            ...HTML_HEADERS,
            "X-Requested-With": "XMLHttpRequest",
          },
          maxBytes: Math.min(MAX_FRAGMENT_BYTES, remainingBytes),
          signal: deadline.signal,
        });
        fragmentBytes += fragment.byteLength;
        replacement = fragment.text;
      } catch {
        cacheControl = NO_STORE_CACHE_CONTROL;
      }
      // Function form: a string replacement would expand $&, $` and $'
      // found in upstream markup (a PR title is enough to trigger it).
      html = html.replace(full, () => replacement);
    }

    if (new TextEncoder().encode(html).byteLength > MAX_OUTPUT_BYTES) {
      throw new Error("Rendered pull request exceeded the body limit");
    }

    // Strip all scripts — GitHub bundle would boot React and fire
    // same-origin requests that resolve against this site.
    html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
    html = html.replace(/<script\b[^>]*\/?>/gi, "");
    // Defense-in-depth: iframe is sandboxed without allow-scripts, but
    // sanitize event handlers / javascript: URLs anyway.
    html = html.replace(
      /<link\b[^>]*\brel=["']modulepreload["'][^>]*>/gi,
      "",
    );
    html = html.replace(/\s+on\w+\s*=\s*"[^"]*"/gi, "");
    html = html.replace(/\s+on\w+\s*=\s*'[^']*'/gi, "");
    html = html.replace(/\s+on\w+\s*=\s*[^\s"'`=<>]+/gi, "");
    html = html.replace(/\s+(href|src|action|xlink:href)\s*=\s*"[^"]*javascript:[^"]*"/gi, ' $1="#"');
    html = html.replace(/\s+(href|src|action|xlink:href)\s*=\s*'[^']*javascript:[^']*'/gi, " $1='#'");
    html = html.replace(/\s+(href|src|action|xlink:href)\s*=\s*javascript:[^\s"'`>]+/gi, ' $1="#"');

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
        "Cache-Control": cacheControl,
      },
    });
  } catch {
    const fallback = buildFallbackHtml(rawUrl);
    return new Response(fallback, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": NO_STORE_CACHE_CONTROL,
      },
    });
  } finally {
    deadline.dispose();
  }
}
