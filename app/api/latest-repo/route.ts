import { env } from "@/lib/env";
import { GITHUB_USER } from "@/lib/site";
import {
  NO_STORE_CACHE_CONTROL,
  SUCCESS_CACHE_CONTROL,
  createUpstreamDeadline,
  fetchUpstreamJson,
} from "@/lib/upstream";

export const dynamic = "force-dynamic";

const ROUTE_DEADLINE_MS = 5000;
const MAX_JSON_BYTES = 262144;

function getGitHubHtmlUrl(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return null;
  const htmlUrl = (value as { html_url?: unknown }).html_url;
  if (typeof htmlUrl !== "string") return null;

  try {
    const parsed = new URL(htmlUrl);
    return parsed.origin === "https://github.com" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function getLatestPullRequestUrl(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return null;
  const items = (value as { items?: unknown }).items;
  return Array.isArray(items) ? getGitHubHtmlUrl(items[0]) : null;
}

function getLatestRepoUrl(value: unknown): string | null {
  return Array.isArray(value) ? getGitHubHtmlUrl(value[0]) : null;
}

export async function GET(): Promise<Response> {
  const fallback = `https://github.com/${GITHUB_USER}`;
  const deadline = createUpstreamDeadline(ROUTE_DEADLINE_MS);

  try {
    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    const token = env.githubToken;
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      const search = await fetchUpstreamJson(
        `https://api.github.com/search/issues?q=author:${GITHUB_USER}+type:pr&sort=created&order=desc&per_page=1`,
        { headers, maxBytes: MAX_JSON_BYTES, signal: deadline.signal },
      );
      const pullRequestUrl = getLatestPullRequestUrl(search);
      if (pullRequestUrl) {
        return Response.json(
          { url: pullRequestUrl },
          { headers: { "Cache-Control": SUCCESS_CACHE_CONTROL } },
        );
      }
    } catch {
      // The repository lookup below shares the remaining route deadline.
    }

    try {
      const repos = await fetchUpstreamJson(
        `https://api.github.com/users/${GITHUB_USER}/repos?sort=pushed&per_page=1`,
        { headers, maxBytes: MAX_JSON_BYTES, signal: deadline.signal },
      );
      const repoUrl = getLatestRepoUrl(repos);
      if (repoUrl) {
        return Response.json(
          { url: repoUrl },
          { headers: { "Cache-Control": SUCCESS_CACHE_CONTROL } },
        );
      }
    } catch {
      // Preserve the profile fallback, but never cache outage output.
    }

    return Response.json(
      { url: fallback },
      { headers: { "Cache-Control": NO_STORE_CACHE_CONTROL } },
    );
  } catch {
    return Response.json(
      { url: fallback },
      { headers: { "Cache-Control": NO_STORE_CACHE_CONTROL } },
    );
  } finally {
    deadline.dispose();
  }
}
