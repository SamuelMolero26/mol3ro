import { GITHUB_URL } from "@/lib/site";

export const revalidate = 3600;

export async function GET(): Promise<Response> {
  try {
    const res = await fetch(GITHUB_URL, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return new Response(
        `Failed to fetch GitHub profile: ${res.status} ${res.statusText}`,
        { status: 500 },
      );
    }

    let html = await res.text();

    // The contribution calendar ships as <include-fragment>, which GitHub's JS
    // resolves at runtime. Scripts are stripped below, so fetch it server-side.
    const fragment = html.match(
      /<include-fragment\b[^>]*\bsrc="([^"]+)"[^>]*>[\s\S]*?<\/include-fragment>/i,
    );
    if (fragment) {
      const src = new URL(fragment[1].replaceAll("&amp;", "&"), "https://github.com/");
      const fragmentRes = await fetch(src, {
        headers: { "User-Agent": "Mozilla/5.0", "X-Requested-With": "XMLHttpRequest" },
        next: { revalidate: 3600 },
      });
      if (fragmentRes.ok) {
        html = html.replace(fragment[0], await fragmentRes.text());
      }
    }

    // GitHub's client bundle assumes it runs on github.com: it boots React and
    // fires same-origin requests that resolve against this site instead, so its
    // error boundary replaces the page. Serve the server-rendered markup only.
    html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
    html = html.replace(/<script\b[^>]*\/?>/gi, "");
    // Defense-in-depth: sandboxed iframes block scripts, but strip event
    // handlers and javascript: URLs anyway so a sandbox misconfiguration
    // cannot turn scraped markup into an XSS vector.
    html = html.replace(/\s+on\w+\s*=\s*"[^"]*"/gi, "");
    html = html.replace(/\s+on\w+\s*=\s*'[^']*'/gi, "");
    html = html.replace(/\s+on\w+\s*=\s*[^\s"'`=<>]+/gi, "");
    html = html.replace(/\s+(href|src|action|xlink:href)\s*=\s*"[^"]*javascript:[^"]*"/gi, ' $1="#"');
    html = html.replace(/\s+(href|src|action|xlink:href)\s*=\s*'[^']*javascript:[^']*'/gi, " $1='#'");
    html = html.replace(/\s+(href|src|action|xlink:href)\s*=\s*javascript:[^\s"'`>]+/gi, ' $1="#"');

    // Resolve every remaining relative URL against github.com.
    html = html.replace(/<head(\s[^>]*)?>/i, '$&<base href="https://github.com/" target="_blank">');

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error fetching GitHub profile";
    return new Response(`Failed to fetch GitHub profile: ${message}`, {
      status: 500,
    });
  }
}
