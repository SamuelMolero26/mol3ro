/**
 * Wire contract for /api/repos, shared by the route and the handset tab.
 * Lives here rather than in the route module so a client component never
 * imports server-only code just to get a type.
 */
export interface RepoSummary {
  name: string;
  description: string | null;
  url: string;
  language: string | null;
  stars: number;
}

export interface ReposResponse {
  repos: RepoSummary[];
  /** false when GitHub could not be reached, so an empty list is not
      mistaken for "this account has no public repos". */
  ok: boolean;
}
