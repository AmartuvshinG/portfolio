"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { navLinks } from "@/lib/content";
import { useSmoothScroll } from "@/components/chrome/SmoothScroll";

/**
 * Two things the site could not do: tell you where you are, and let you skip.
 *
 * **Hash sync.** Scrolling to a section rewrites the URL to match, so the
 * address bar is always a link to what is on screen. `replaceState`, never
 * `push` — a page with ten sections would otherwise stack ten history entries
 * on one scroll and make the back button useless.
 *
 * **Chapter keys.** `j`/`k` and the arrows jump section to section. On a page
 * that is deliberately this long, somebody who wants the work should not have
 * to scroll past a city to reach it.
 *
 * Both are inert while a field has focus, and both stand down while an overlay
 * is open — arrow keys belong to the palette's result list when it is up, and
 * to the dossier when that is.
 *
 * Headless (renders nothing): it is behaviour, not chrome.
 */
export function ChapterKeys() {
  const pathname = usePathname();
  const { scrollTo } = useSmoothScroll();
  /* The index the *scroll* last reported, kept in a ref rather than state: it
     changes at scroll frequency and nothing renders from it. */
  const current = useRef(0);

  useEffect(() => {
    if (pathname !== "/") return;

    const sections = navLinks
      .map((l) => ({ href: l.href, el: document.querySelector<HTMLElement>(l.href) }))
      .filter((s): s is { href: string; el: HTMLElement } => Boolean(s.el));
    if (!sections.length) return;

    /* --- Hash sync, off the same 50% line the nav and the chapter frame use,
       so all three agree about which section you are in. */
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!hit) return;
        const i = sections.findIndex((s) => s.el === hit.target);
        if (i < 0) return;
        current.current = i;
        const href = sections[i].href;
        if (window.location.hash !== href) {
          window.history.replaceState(null, "", href);
        }
      },
      { rootMargin: "-50% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach((s) => observer.observe(s.el));

    /* --- Chapter keys. */
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const el = document.activeElement as HTMLElement | null;
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el?.isContentEditable
      )
        return;

      /* An overlay owns the arrow keys while it is up. Checked from the DOM
         rather than by wiring state between three unrelated components. */
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;

      const step =
        e.key === "j" || e.key === "ArrowDown"
          ? 1
          : e.key === "k" || e.key === "ArrowUp"
            ? -1
            : 0;
      if (!step) return;

      const next = current.current + step;
      if (next < 0 || next >= sections.length) return;
      e.preventDefault();
      current.current = next;
      scrollTo(sections[next].href);
    };

    window.addEventListener("keydown", onKey);
    return () => {
      observer.disconnect();
      window.removeEventListener("keydown", onKey);
    };
  }, [pathname, scrollTo]);

  return null;
}
