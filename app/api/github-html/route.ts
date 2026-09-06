import { GITHUB_URL } from "@/lib/site";
import {
  NO_STORE_CACHE_CONTROL,
  SUCCESS_CACHE_CONTROL,
  createUpstreamDeadline,
  fetchUpstreamText,
} from "@/lib/upstream";

export const dynamic = "force-dynamic";

const GITHUB_ORIGIN = "https://github.com";
const ROUTE_DEADLINE_MS = 8000;
const MAX_PROFILE_BYTES = 1048576;
const MAX_CONTRIBUTION_BYTES = 262144;

const HTML_HEADERS = { "User-Agent": "Mozilla/5.0" };
const GITHUB_PROFILE_URL = new URL(GITHUB_URL);
const CONTRIBUTION_QUERY_KEYS = new Set([
  "action",
  "controller",
  "tab",
  "user_id",
]);

function isContributionFragment(url: URL): boolean {
  return (
    url.origin === GITHUB_ORIGIN &&
    url.pathname === GITHUB_PROFILE_URL.pathname &&
    url.searchParams.get("action") === "show" &&
    url.searchParams.get("controller") === "profiles" &&
    url.searchParams.get("tab") === "contributions" &&
    url.searchParams.get("user_id") === GITHUB_PROFILE_URL.pathname.slice(1) &&
    [...url.searchParams.keys()].every((key) =>
      CONTRIBUTION_QUERY_KEYS.has(key),
    )
  );
}

export async function GET(): Promise<Response> {
  const deadline = createUpstreamDeadline(ROUTE_DEADLINE_MS);

  try {
    const profile = await fetchUpstreamText(GITHUB_URL, {
      headers: HTML_HEADERS,
      maxBytes: MAX_PROFILE_BYTES,
      signal: deadline.signal,
    });
    let html = profile.text;
    let cacheControl = SUCCESS_CACHE_CONTROL;

    // The contribution calendar ships as <include-fragment>, which GitHub's JS
    // resolves at runtime. Scripts are stripped below, so fetch it server-side.
    const fragment = html.match(
      /<include-fragment\b[^>]*\bsrc="([^"]+)"[^>]*>[\s\S]*?<\/include-fragment>/i,
    );
    if (fragment) {
      let replacement = "";
      try {
        const src = new URL(
          fragment[1].replaceAll("&amp;", "&"),
          `${GITHUB_ORIGIN}/`,
        );
        if (!isContributionFragment(src)) {
          throw new Error("Unexpected contribution fragment URL");
        }
        const contribution = await fetchUpstreamText(src, {
          headers: {
            ...HTML_HEADERS,
            "X-Requested-With": "XMLHttpRequest",
          },
          maxBytes: MAX_CONTRIBUTION_BYTES,
          signal: deadline.signal,
        });
        replacement = contribution.text;
      } catch {
        cacheControl = NO_STORE_CACHE_CONTROL;
      }
      // Function form: a string replacement would expand $&, $` and $'
      // found in upstream markup (a PR title is enough to trigger it).
      html = html.replace(fragment[0], () => replacement);
    }

    // GitHub's client bundle assumes it runs on github.com: it boots React and
    // fires same-origin requests that resolve against this site instead, so its
    // error boundary replaces the page. Serve the server-rendered markup only.
    html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
    html = html.replace(/<script\b[^>]*\/?>/gi, "");
    // Defense-in-depth: sandboxed iframes block scripts, but strip event
    // handlers and javascript: URLs anyway so a sandbox misconfiguration
    // cannot turn scraped markup into an XSS vector.
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

    // Resolve every remaining relative URL against github.com.
    html = html.replace(/<head(\s[^>]*)?>/i, '$&<base href="https://github.com/" target="_blank">');

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": cacheControl,
      },
    });
  } catch {
    return new Response("Failed to fetch GitHub profile", {
      status: 502,
      headers: {
        "Cache-Control": NO_STORE_CACHE_CONTROL,
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } finally {
    deadline.dispose();
  }
}
