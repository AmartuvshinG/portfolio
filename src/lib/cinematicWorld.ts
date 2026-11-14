/** Imperative scene frames: no React renders or document-wide style writes. */
export const WORLD_CHAPTERS = ["hero", "about", "connect", "work", "capabilities", "anatomy", "timeline", "contact"] as const;
export type WorldChapter = typeof WORLD_CHAPTERS[number];
export const isWorldChapter = (id: string): id is WorldChapter => WORLD_CHAPTERS.some((chapter) => chapter === id);
export interface WorldFrame { chapter: WorldChapter; progress: number }
let frame: WorldFrame = { chapter: "hero", progress: 0 };
const listeners = new Set<() => void>();
export const readWorldFrame = () => frame;
export function setWorldFrame(next: WorldFrame) {
  if (next.chapter === frame.chapter && Math.abs(next.progress - frame.progress) < 0.0005) return;
  frame = next;
  for (const notify of listeners) notify();
}
export function onWorldFrame(notify: () => void) {
  listeners.add(notify);
  return () => { listeners.delete(notify); };
}
