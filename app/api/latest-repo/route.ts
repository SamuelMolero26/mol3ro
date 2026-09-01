import { GITHUB_USER } from "@/lib/site";

export const revalidate = 3600;

export async function GET() {
  const fallback = `https://github.com/${GITHUB_USER}`;
  const res = await fetch(
    `https://api.github.com/users/${GITHUB_USER}/repos?sort=pushed&per_page=1`,
    { headers: { Accept: "application/vnd.github+json" } },
  );
  if (!res.ok) return Response.json({ url: fallback });
  const [repo] = await res.json();
  return Response.json({ url: repo?.html_url ?? fallback });
}
