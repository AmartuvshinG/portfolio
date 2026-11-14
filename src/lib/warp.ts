/** A chapter jump, announced by SmoothScroll's `goTo` for the warp card. */
export const WARP_EVENT = "chapter-warp";

export type WarpDetail = { href: string; dir: "down" | "up"; far: boolean };

export function announceWarp(detail: WarpDetail) {
  window.dispatchEvent(new CustomEvent<WarpDetail>(WARP_EVENT, { detail }));
}
