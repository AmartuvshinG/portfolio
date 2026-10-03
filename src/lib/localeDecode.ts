import { decode } from "@/lib/neonField";

/**
 * Switching language decodes the headings on screen into the new one.
 *
 * React has already written the new words by the time this runs; this plays
 * them in — each visible chapter heading flips through look-alikes of its
 * own script (Cyrillic for Mongolian, Latin for English) and settles left to
 * right, ~420 ms, once. The site's dot-matrix vocabulary, used for the one
 * moment the whole page changes what it says.
 *
 * Only headings whose content is a single text node are touched, and only
 * that node's `nodeValue` — the same node React holds — so React's tree and
 * the DOM never disagree. Reduced motion: nothing runs.
 */
const DUR = 420;

export function decodeVisibleHeadings() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const vh = window.innerHeight;
  const nodes: { node: Text; text: string }[] = [];
  for (const el of document.querySelectorAll<HTMLElement>("main h2, main h3")) {
    if (el.childNodes.length !== 1 || el.firstChild?.nodeType !== Node.TEXT_NODE) continue;
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh || r.width === 0) continue;
    const node = el.firstChild as Text;
    nodes.push({ node, text: node.nodeValue ?? "" });
  }
  if (!nodes.length) return;
  const t0 = performance.now();
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / DUR);
    const tick = Math.floor(now / 40);
    for (const { node, text } of nodes) {
      // React may have moved on (another switch): leave the node alone.
      if (!node.isConnected) continue;
      node.nodeValue = p >= 1 ? text : decode(text, p, tick);
    }
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
