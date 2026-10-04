"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { navLinks } from "@/lib/content";
import { isCaseHash } from "@/lib/caseFile";
import { isInteractive, isTextEntry, modalOpen } from "@/lib/keys";
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
 * Both stand down while an overlay is open — arrow keys belong to the palette's
 * result list when it is up, and to the dossier when that is. The arrows are
 * further limited to the case where focus is on the document itself; see the
 * handler. Any subtree can opt out entirely with `data-chapter-keys="off"`.
 *
 * Headless (renders nothing): it is behaviour, not chrome.
 */
export function ChapterKeys() {
  const pathname = usePathname();
  const { goTo } = useSmoothScroll();
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
        /* An open case file owns the hash (`#case=…`) — overwriting it with
           the section under it would break the share link and the Back
           button's "close" in one go. */
        if (isCaseHash(window.location.hash)) return;
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
      /* Holding a key would fire one jump per repeat and fling you through the
         page; one press, one chapter. */
      if (e.repeat) return;

      const el = document.activeElement;

      /* An overlay owns the keyboard while it is up. Checked from the DOM
         rather than by wiring state between three unrelated components. */
      if (modalOpen()) return;
      /* An explicit opt-out for any subtree that needs the arrows for itself. */
      if (el?.closest('[data-chapter-keys="off"]')) return;

      const vertical = e.key === "ArrowDown" || e.key === "ArrowUp";
      const vim = e.key === "j" || e.key === "k";
      if (!vertical && !vim) return;

      /* The rule, and the whole fix in this file: the arrows are only ours
         while focus is on the *document* — reading, not operating a control.
         The old test excluded text fields alone, so a focused link or button
         also lost arrow-key scrolling, and since clicking anything leaves it
         focused, that was most keyboard users most of the time. `j`/`k` stay
         unconditional outside text entry: they steal no native behaviour. */
      if (vertical ? isInteractive(el) : isTextEntry(el)) return;

      const step = e.key === "ArrowDown" || e.key === "j" ? 1 : -1;
      const next = current.current + step;
      if (next < 0 || next >= sections.length) return;
      e.preventDefault();
      current.current = next;
      goTo(sections[next].href);
    };

    window.addEventListener("keydown", onKey);
    return () => {
      observer.disconnect();
      window.removeEventListener("keydown", onKey);
    };
  }, [pathname, goTo]);

  return null;
}
