/**
 * Case files live in the URL hash: `/#case=spotfixes`.
 *
 * The site is one route. A case file opens over the home page instead of
 * navigating away from it, so the visitor keeps their place in the scroll, and
 * the hash is what makes one shareable and what lets the browser's Back button
 * close it — every open is a history entry.
 *
 * Opening goes through `openCase` rather than setting `location.hash` directly,
 * for two reasons. `pushState` does not fire `hashchange`, so the host is told
 * with an event instead; and assigning `location.hash` would make the browser
 * try to scroll to an element called `case=spotfixes`, which under Lenis is a
 * jump the smooth-scroll layer never hears about.
 */

import { playNeonGate } from "@/lib/neonGate";

export const CASE_EVENT = "casefile:change";

const PATTERN = /^#case=([a-z0-9-]+)$/i;

export function caseHash(slug: string): string {
  return `#case=${slug}`;
}

/** The slug in the current URL, or null. */
export function readCase(): string | null {
  if (typeof window === "undefined") return null;
  return window.location.hash.match(PATTERN)?.[1] ?? null;
}

/** True for hashes this module owns — other hash readers must skip them. */
export function isCaseHash(hash: string): boolean {
  return PATTERN.test(hash);
}

/**
 * Open a case file as a new history entry.
 *
 * The entry *under* it is first stripped of its section hash. ChapterKeys keeps
 * the URL at `#work` (or wherever the reader is), and going Back to an entry
 * with a hash makes the router scroll to that anchor — which dropped the reader
 * at the top of the section instead of where they were reading. With no hash
 * there is nothing to scroll to, the page stays put, and ChapterKeys writes the
 * section hash back on the next scroll anyway.
 */
export function openCase(slug: string) {
  /* The file opens through the neon gate: its name condenses while its
     pictures load, and the file is mounted the moment the name locks, so
     the window tears open onto it (lib/neonGate). Under reduced motion the
     gate calls straight through. */
  playNeonGate({
    slug,
    onCovered: () => {
      const { pathname, search } = window.location;
      window.history.replaceState(window.history.state, "", pathname + search);
      window.history.pushState(window.history.state, "", caseHash(slug));
      window.dispatchEvent(new CustomEvent(CASE_EVENT, { detail: { pushed: true } }));
    },
  });
}

/** Switch case files in place — prev/next inside an open file, no new entry. */
export function replaceCase(slug: string) {
  window.history.replaceState(window.history.state, "", caseHash(slug));
  window.dispatchEvent(new CustomEvent(CASE_EVENT, { detail: { pushed: false } }));
}

/** Drop the hash without touching the scroll position. */
export function clearCase() {
  const { pathname, search } = window.location;
  window.history.replaceState(window.history.state, "", pathname + search);
  window.dispatchEvent(new CustomEvent(CASE_EVENT, { detail: { pushed: false } }));
}
