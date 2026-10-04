/**
 * The neon gate: how a case file opens and closes.
 *
 * **Opening** has a real wait in it: a case file is mostly screenshots, and
 * they have to arrive. So the file opens behind a gate (NeonGateHost) — the
 * project's name condensing out of the rain while its images load, the count
 * under it the share that have actually decoded. When the name locks, the
 * file is mounted underneath (`onCovered`) and a slit of light tears across
 * the screen and opens onto it.
 *
 * **Closing** is the same window shutting: the dark closes in from the edges
 * to a slit of light over the file, the slit closes, the file is gone
 * (`onCovered`), and the dark lifts off the page it was opened from.
 *
 * Same contract as the old ink wipe, which it replaced for case files (the ink
 * still turns the phone index's page): under reduced motion, or with no host
 * mounted, both call straight through and the file simply appears or goes.
 */

export interface GateRequest {
  id: number;
  slug: string;
  /** This file has been opened before in this visit: its images are warm. */
  warm: boolean;
  onCovered: () => void;
  resolve: () => void;
}

let host: ((r: GateRequest) => void) | null = null;
let busy = false;
let seq = 0;
const opened = new Set<string>();

/** NeonGateHost registers itself here; returns the unregister. */
export function registerNeonGate(fn: (r: GateRequest) => void) {
  host = fn;
  return () => {
    if (host === fn) host = null;
  };
}

const still = () =>
  typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Open a case file through the gate. Resolves once the window is open. */
export function playNeonGate({ slug, onCovered }: { slug: string; onCovered: () => void }): Promise<void> {
  if (busy || !host || still()) {
    onCovered();
    return Promise.resolve();
  }
  busy = true;
  const warm = opened.has(slug);
  opened.add(slug);
  const h = host;
  return new Promise((resolve) => {
    h({
      id: ++seq,
      slug,
      warm,
      onCovered,
      resolve: () => {
        busy = false;
        resolve();
      },
    });
  });
}

const SHUT_MS = 620;
const LIFT_MS = 320;

/** Close a case file: the window shuts over it. Resolves as the dark lifts. */
export function playWindowShut({ onCovered }: { onCovered: () => void }): Promise<void> {
  if (busy || still()) {
    onCovered();
    return Promise.resolve();
  }
  busy = true;
  const veil = document.createElement("div");
  veil.className = "gate-shut";
  veil.setAttribute("aria-hidden", "true");
  const frame = document.createElement("div");
  frame.className = "gate-shut-frame";
  frame.setAttribute("aria-hidden", "true");
  document.body.append(veil, frame);
  return new Promise((resolve) => {
    window.setTimeout(() => {
      onCovered();
      frame.remove();
      // Let the page under it paint once before the dark lifts.
      requestAnimationFrame(() => {
        veil.setAttribute("data-done", "");
        window.setTimeout(() => {
          veil.remove();
          busy = false;
          resolve();
        }, LIFT_MS);
      });
    }, SHUT_MS);
  });
}
