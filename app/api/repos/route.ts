import { env } from "@/lib/env";
import { GITHUB_USER } from "@/lib/site";
import type { RepoSummary } from "@/lib/github";
import {
  NO_STORE_CACHE_CONTROL,
  SUCCESS_CACHE_CONTROL,
  createUpstreamDeadline,
  fetchUpstreamJson,
} from "@/lib/upstream";

export const dynamic = "force-dynamic";

const PINNED = ["droids-mem", "mcp-go", "mol3ro"];

const MAX_REPOS = 8;
const MAX_JSON_BYTES = 1048576;
const ROUTE_DEADLINE_MS = 5000;

/* PINNED is a short hand-kept list, so indexOf is fine here. */
const rank = (name: string) => {
  const index = PINNED.indexOf(name);
  return index === -1 ? PINNED.length : index;
};

interface GitHubRepo {
  name?: string;
  description?: string | null;
  html_url?: string;
  language?: string | null;
  stargazers_count?: number;
  fork?: boolean;
  archived?: boolean;
}

function toSummary(repo: GitHubRepo): RepoSummary | null {
  if (!repo.name || !repo.html_url) return null;
  return {
    name: repo.name,
    description: repo.description ?? null,
    url: repo.html_url,
    language: repo.language ?? null,
    stars: repo.stargazers_count ?? 0,
  };
}

export async function GET(): Promise<Response> {
  const deadline = createUpstreamDeadline(ROUTE_DEADLINE_MS);

  try {
    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    const token = env.githubToken;
    if (token) headers.Authorization = `Bearer ${token}`;

    const raw = await fetchUpstreamJson(
      `https://api.github.com/users/${GITHUB_USER}/repos?sort=pushed&per_page=60`,
      { headers, maxBytes: MAX_JSON_BYTES, signal: deadline.signal },
    );
    if (!Array.isArray(raw)) throw new Error("Unexpected GitHub response");

    const repos = (raw as GitHubRepo[])
      .filter((repo) => !repo.fork && !repo.archived)
      .map(toSummary)
      .filter((repo): repo is RepoSummary => repo !== null)
      .sort((a, b) => rank(a.name) - rank(b.name))
      .slice(0, MAX_REPOS);

    return Response.json(
      { repos, ok: true },
      { headers: { "Cache-Control": SUCCESS_CACHE_CONTROL } },
    );
  } catch {
    return Response.json(
      { repos: [], ok: false },
      {
        status: 502,
        headers: { "Cache-Control": NO_STORE_CACHE_CONTROL },
      },
    );
  } finally {
    deadline.dispose();
  }
}
