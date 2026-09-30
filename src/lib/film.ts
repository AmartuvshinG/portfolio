/**
 * Helpers for the scroll-scrubbed film behind the site (FilmBackdrop).
 *
 * Smoothness lives mostly in the files, not the code. Scrubbing is seeking, and
 * a seek decodes from the previous keyframe; the reference city clip had one
 * keyframe for all 192 frames, so a seek near its end decoded the whole film
 * (45ms mean, 83ms worst). `public/film/*` are re-encoded with a keyframe every
 * third frame and no B-frames (4ms mean, 7ms worst), and are fetched whole into
 * memory so no seek ever waits on the network. Re-encode any replacement the
 * same way: `-g 3 -keyint_min 3 -sc_threshold 0 -bf 0`.
 */

/** Self-hosted, short-GOP encodes. Phones get the 1080-wide set. */
export const FILM = {
  desktop: { city: "/film/city-1080.mp4", iss: "/film/iss-1080.mp4" },
  phone: { city: "/film/city-720.mp4", iss: "/film/iss-720.mp4" },
  poster: "/film/iss-poster.jpg",
} as const;

export function clamp(v: number, lo = 0, hi = 1) {
  return Math.min(hi, Math.max(lo, v));
}

export const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/**
 * One seek in flight per video, the latest request queued behind it. Setting
 * `currentTime` again before `seeked` restarts the decode, and a fast scrub
 * then never paints a frame at all. A request for the frame already on screen
 * is dropped, so a film at rest — or crawling within one frame — costs nothing.
 */
export function seeker(video: HTMLVideoElement, fps = 24) {
  let busy = false;
  let queued: number | null = null;
  let lastFrame = -1;
  const frameOf = (t: number) => Math.round(t * fps);
  const go = (t: number) => {
    busy = true;
    lastFrame = frameOf(t);
    video.currentTime = t;
  };
  const onSeeked = () => {
    busy = false;
    if (queued !== null) {
      const t = queued;
      queued = null;
      if (frameOf(t) !== lastFrame) go(t);
    }
  };
  video.addEventListener("seeked", onSeeked);
  return {
    to(t: number) {
      if (busy) {
        queued = t;
        return;
      }
      if (frameOf(t) === lastFrame) return;
      go(t);
    },
    dispose: () => video.removeEventListener("seeked", onSeeked),
  };
}

/** Kick a muted video into decoding. iOS Safari may not paint a frame of a
 *  video that is only ever seeked until it has played once. */
export function kickstart(video: HTMLVideoElement) {
  const p = video.play();
  if (p && typeof p.then === "function") p.then(() => video.pause()).catch(() => {});
  else video.pause();
}

/** Fetch a clip whole and hand the element a blob URL, so every seek is local.
 *  Returns the URL for the caller to revoke. */
export async function loadWhole(video: HTMLVideoElement, url: string, signal: AbortSignal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  const src = URL.createObjectURL(await res.blob());
  video.src = src;
  kickstart(video);
  return src;
}
