"use client";

import { useEffect, type RefObject } from "react";
import { useLockScroll } from "@/hooks/useLockScroll";

/* Wider than the selector ProjectDossier hand-rolled, which missed form
   controls entirely — the command palette's only tabbable node *is* an
   `<input>`, so a trap built on the narrow list would have had nothing to
   cycle. `:not([hidden])` and the offsetParent check below drop nodes that are
   in the DOM but not on screen (an exiting AnimatePresence child, a collapsed
   panel), which a trap must never land focus on. */
const TABBABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  "details > summary",
  "[tabindex]:not([tabindex='-1'])",
]
  .map((s) => `${s}:not([hidden]):not([aria-hidden='true'])`)
  .join(",");

function tabbables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(TABBABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement
  );
}

/* Lenis owns scroll. A browser-initiated focus scroll while the lock is held
   moves the document under GSAP's pinned triggers without telling either of
   them, and the page comes back from the overlay at the wrong offset with the
   pins desynced. Every focus call in this file goes through here. */
function focusSilently(el: HTMLElement | null | undefined) {
  el?.focus({ preventScroll: true });
}

export interface OverlayOptions {
  /** Whether the overlay is currently open. */
  open: boolean;
  /** Called on Escape, and on nothing else — outside-click stays the caller's. */
  onClose: () => void;
  /** The dialog element. Focus is trapped inside it. */
  ref: RefObject<HTMLElement | null>;
  /**
   * What to focus on open. Defaults to `[data-autofocus]` inside `ref`, then
   * the first tabbable, then the dialog itself.
   */
  initialFocus?: RefObject<HTMLElement | null>;
  /**
   * Where to send focus on close. Defaults to whatever had it when the overlay
   * opened — which is wrong for surfaces that capture the trigger *before*
   * `open` flips (the command palette does, because ⌘K fires while focus is
   * still on whatever you were reading).
   */
  restoreFocus?: RefObject<HTMLElement | null>;
  /** Default true. */
  lockScroll?: boolean;
  /** Default true. */
  closeOnEscape?: boolean;
}

/**
 * The one modal contract: trap Tab, close on Escape, restore focus, hold the
 * scroll lock.
 *
 * Extracted from ProjectDossier, which was the only surface on the site that
 * got this right, so that the other three cannot drift from it. Four things
 * differ from that original, all of them bugs it happened not to hit:
 *
 * 1. The tabbable selector includes form controls and excludes hidden nodes.
 * 2. Every focus is `{ preventScroll: true }` — see `focusSilently`.
 * 3. Restore is guarded on `isConnected`: an overlay opened from a card inside
 *    a pinned track can outlive its own trigger, and focusing a detached node
 *    silently drops focus to `<body>`.
 * 4. The key listener is on `document` in the **capture** phase. On `window`
 *    in the bubble phase, anything that stops propagation — a nested input, a
 *    third-party embed — eats Escape and the overlay becomes unclosable by
 *    keyboard.
 */
export function useOverlay({
  open,
  onClose,
  ref,
  initialFocus,
  restoreFocus,
  lockScroll = true,
  closeOnEscape = true,
}: OverlayOptions) {
  useLockScroll(lockScroll && open);

  useEffect(() => {
    if (!open) return;

    const root = ref.current;
    const previous =
      restoreFocus?.current ?? (document.activeElement as HTMLElement | null);

    /* Initial focus. The dialog itself is the last resort rather than a
       failure case: it keeps focus inside the trap even for an overlay whose
       content hasn't mounted yet, which is the state a Framer enter animation
       is in on its first frame. */
    if (root) {
      const explicit =
        initialFocus?.current ??
        root.querySelector<HTMLElement>("[data-autofocus]") ??
        tabbables(root)[0];
      if (explicit) {
        focusSilently(explicit);
      } else {
        if (!root.hasAttribute("tabindex")) root.setAttribute("tabindex", "-1");
        focusSilently(root);
      }
    }

    const onKey = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const panel = ref.current;
      if (!panel) return;
      const items = tabbables(panel);

      /* No tabbable content: hold focus on the dialog rather than letting Tab
         escape to the page behind, which `aria-modal` has told the screen
         reader does not exist. */
      if (items.length === 0) {
        e.preventDefault();
        focusSilently(panel);
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault();
        focusSilently(last);
      } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
        e.preventDefault();
        focusSilently(first);
      }
    };

    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      if (previous?.isConnected) focusSilently(previous);
    };
    // `initialFocus`/`restoreFocus` are refs — stable identities, read once on
    // open by design. Listing them would re-run the trap and re-fire the
    // initial focus every time a parent re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose, ref, closeOnEscape]);
}
