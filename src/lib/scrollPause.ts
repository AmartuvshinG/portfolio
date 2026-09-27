/**
 * "Is the page being scrolled right now?" — as an attribute, not a number.
 *
 * The aurora is the only thing that listens. It animates while the page is
 * still and freezes the instant a scroll starts, so every frame of a scroll
 * goes to the content instead of to a background nobody is looking at.
 *
 * The attribute lands on the aurora's own root, never on `<html>`: writing to
 * the root element invalidates style for the whole document, which is one of
 * the things that made this site laggy the first time. It is written once when
 * a scroll starts and once when it stops — never per frame.
 */

const IDLE_MS = 180;

let target: HTMLElement | null = null;
let scrolling = false;
let timer: ReturnType<typeof setTimeout> | undefined;

/** Register the element that should carry `data-scrolling`. */
export function registerScrollPause(el: HTMLElement) {
  target = el;
  if (scrolling) el.setAttribute("data-scrolling", "");
  return () => {
    if (target === el) target = null;
  };
}

/** Called from the Lenis scroll handler on every scroll event. */
export function noteScroll() {
  if (!scrolling) {
    scrolling = true;
    target?.setAttribute("data-scrolling", "");
  }
  clearTimeout(timer);
  timer = setTimeout(() => {
    scrolling = false;
    target?.removeAttribute("data-scrolling");
  }, IDLE_MS);
}
