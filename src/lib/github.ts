/**
 * Live GitHub facts for the Signal panel, fetched on the server.
 *
 * Revalidated daily, so the numbers are real without a request per visit and
 * without the unauthenticated rate limit (60/hour) ever mattering. Any failure
 * — network, rate limit, a renamed account — returns `null`, and the panel
 * simply shows the handle as it did before. Nothing here is ever invented.
 *
 * Two requests: the profile (for the public repo count) and up to 100 repos,
 * from which everything else is read — the most recent push, the three most
 * recent repos, the language mix, and the log of when each was started.
 */

const USER = "amartuvshing";

export interface GitHubSummary {
  repos: number;
  /** ISO timestamp of the most recent push to a non-fork repo. */
  lastPush: string | null;
  recent: { name: string; language: string | null }[];
  /** Own repos per primary language, most first. Repos with none are left out. */
  languages: { name: string; count: number }[];
  /** Own repos by the day they were started, oldest first. */
  log: { name: string; created: string; language: string | null }[];
}

export async function getGitHubSummary(): Promise<GitHubSummary | null> {
  try {
    const opts = { next: { revalidate: 86400 }, headers: { Accept: "application/vnd.github+json" } };
    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${USER}`, opts),
      fetch(`https://api.github.com/users/${USER}/repos?sort=pushed&per_page=100`, opts),
    ]);
    if (!userRes.ok || !reposRes.ok) return null;
    const user = (await userRes.json()) as { public_repos?: number };
    const repos = (await reposRes.json()) as {
      name: string;
      language: string | null;
      fork: boolean;
      pushed_at: string;
      created_at: string;
    }[];
    if (typeof user.public_repos !== "number" || !Array.isArray(repos)) return null;
    const own = repos.filter((r) => !r.fork);

    const counts = new Map<string, number>();
    for (const r of own) if (r.language) counts.set(r.language, (counts.get(r.language) ?? 0) + 1);
    const languages = [...counts]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    const log = own
      .map((r) => ({ name: r.name, created: r.created_at, language: r.language }))
      .sort((a, b) => a.created.localeCompare(b.created));

    return {
      repos: user.public_repos,
      lastPush: own[0]?.pushed_at ?? null,
      recent: own.slice(0, 3).map((r) => ({ name: r.name, language: r.language })),
      languages,
      log,
    };
  } catch {
    return null;
  }
}
