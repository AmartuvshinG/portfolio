/**
 * The height a pinned frame actually has, for scroll maths.
 *
 * Not `innerHeight`. On iOS Safari, `innerHeight` grows and shrinks as the
 * toolbars collapse and return, which happens on almost every fling. The
 * pinned frames are `h-svh` so they never resize mid-scroll, so their travel
 * has to be measured against the same small viewport, or each toolbar change
 * moves every plateau under the finger. The root's `clientHeight` is the
 * initial containing block, which iOS sizes to that small viewport and holds
 * still. On desktop it equals `innerHeight` (the page has no scrollbar).
 */
export function frameHeight(): number {
  return document.documentElement.clientHeight;
}
