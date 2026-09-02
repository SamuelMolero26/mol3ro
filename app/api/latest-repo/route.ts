import { env } from "@/lib/env";
import { GITHUB_USER } from "@/lib/site";
export const revalidate = 3600;
export async function GET() {
  const fallback = `https://github.com/${GITHUB_USER}`;
  try {
    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    const token = env.githubToken;
    if (token) headers.Authorization = `Bearer ${token}`;
    // 1) Try latest PR authored by user (search issues)
    const prRes = await fetch(
      `https://api.github.com/search/issues?q=author:${GITHUB_USER}+type:pr&sort=created&order=desc&per_page=1`,
      { headers, next: { revalidate: 3600 } }
    );
    if (prRes.ok) {
      const prData = (await prRes.json()) as { items?: Array<{ html_url?: string }> };
      const prUrl = prData.items?.[0]?.html_url;
      if (prUrl && typeof prUrl === "string") return Response.json({ url: prUrl });
    }
    // 2) Fallback: latest pushed repo
    const repoRes = await fetch(
      `https://api.github.com/users/${GITHUB_USER}/repos?sort=pushed&per_page=1`,
      { headers, next: { revalidate: 3600 } }
    );
    if (repoRes.ok) {
      const repos = await repoRes.json();
      const repo = Array.isArray(repos) ? repos[0] : null;
      if (repo?.html_url) return Response.json({ url: repo.html_url });
    }
    return Response.json({ url: fallback });
  } catch {
    return Response.json({ url: `https://github.com/${GITHUB_USER}` });
  }
}
