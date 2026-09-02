/**
 * Centralized env access — typed, single place.
 * All process.env reads should go through here; callers import from @/lib/env
 * instead of touching process.env directly. Keeps scattered env access from
 * spreading across route handlers.
 */

export const env = {
  /** Optional GitHub token for the GitHub API routes (higher rate limit). */
  githubToken: process.env.GITHUB_TOKEN ?? "",
} as const;
