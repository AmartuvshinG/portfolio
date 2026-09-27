/**
 * Live GitHub facts for the Signal panel, fetched on the server.
 *
 * Revalidated daily, so the numbers are real without a request per visit and
 * without the unauthenticated rate limit (60/hour) ever mattering. Any failure
 * — network, rate limit, a renamed account — returns `null`, and the panel
 * simply shows the handle as it did before. Nothing here is ever invented.
 */

const USER = "amartuvshing";

export interface GitHubSummary {
  repos: number;
  /** ISO timestamp of the most recent push to a non-fork repo. */
  lastPush: string | null;
  recent: { name: string; language: string | null }[];
}

export async function getGitHubSummary(): Promise<GitHubSummary | null> {
  try {
    const opts = { next: { revalidate: 86400 }, headers: { Accept: "application/vnd.github+json" } };
    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${USER}`, opts),
      fetch(`https://api.github.com/users/${USER}/repos?sort=pushed&per_page=10`, opts),
    ]);
    if (!userRes.ok || !reposRes.ok) return null;
    const user = (await userRes.json()) as { public_repos?: number };
    const repos = (await reposRes.json()) as { name: string; language: string | null; fork: boolean; pushed_at: string }[];
    const own = repos.filter((r) => !r.fork);
    if (typeof user.public_repos !== "number") return null;
    return {
      repos: user.public_repos,
      lastPush: own[0]?.pushed_at ?? null,
      recent: own.slice(0, 3).map((r) => ({ name: r.name, language: r.language })),
    };
  } catch {
    return null;
  }
}
