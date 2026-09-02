import { env } from "@/lib/env";
import { GITHUB_USER } from "@/lib/site";

export const revalidate = 3600;

const PINNED = ["droids-mem", "mcp-go", "mol3ro"];

const MAX_REPOS = 8;

/* PINNED is a short hand-kept list, so indexOf is fine here. */
const rank = (name: string) => {
  const index = PINNED.indexOf(name);
  return index === -1 ? PINNED.length : index;
};

export interface RepoSummary {
  name: string;
  description: string | null;
  url: string;
  language: string | null;
  stars: number;
}

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

export async function GET() {
  try {
    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    const token = env.githubToken;
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(
      `https://api.github.com/users/${GITHUB_USER}/repos?sort=pushed&per_page=60`,
      { headers, next: { revalidate: 3600 } },
    );
    if (!res.ok) return Response.json({ repos: [] }, { status: 502 });

    const raw = await res.json();
    if (!Array.isArray(raw)) return Response.json({ repos: [] }, { status: 502 });

    const repos = (raw as GitHubRepo[])
      .filter((repo) => !repo.fork && !repo.archived)
      .map(toSummary)
      .filter((repo): repo is RepoSummary => repo !== null)
      .sort((a, b) => rank(a.name) - rank(b.name))
      .slice(0, MAX_REPOS);

    return Response.json({ repos });
  } catch {
    return Response.json({ repos: [] }, { status: 500 });
  }
}
