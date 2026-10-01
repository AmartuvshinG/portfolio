/**
 * One sign writes at a time.
 *
 * Each written sign (ui/InkSign, `lit="write"`) holds a WebGL context for a
 * few seconds. Two arriving together — the About plate and the hero's sign
 * on a tall screen — would otherwise each spin one up beside the film's,
 * and browsers cap live contexts. So writes queue: a job starts when the one
 * before it calls `done`, and a job cancelled before its turn never starts.
 *
 * It also carries the "rewrite" broadcast (the ⌘K palette's Rewrite signs):
 * every mounted sign that is on screen writes itself again.
 */

type Job = (done: () => void) => void;

const queue: { job: Job; cancelled: boolean }[] = [];
let running = false;

function next() {
  while (queue.length && queue[0].cancelled) queue.shift();
  const item = queue.shift();
  if (!item) {
    running = false;
    return;
  }
  running = true;
  let finished = false;
  item.job(() => {
    if (finished) return;
    finished = true;
    next();
  });
}

/** Queue a write. Returns a cancel for a job that has not started yet. */
export function enqueueWrite(job: Job): () => void {
  const item = { job, cancelled: false };
  queue.push(item);
  if (!running) next();
  return () => {
    item.cancelled = true;
  };
}

const REWRITE = "ink:rewrite";
export function requestRewrite() {
  window.dispatchEvent(new Event(REWRITE));
}
export function onRewrite(fn: () => void) {
  window.addEventListener(REWRITE, fn);
  return () => window.removeEventListener(REWRITE, fn);
}
