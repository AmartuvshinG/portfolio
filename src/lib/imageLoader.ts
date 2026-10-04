/**
 * next/image loader for the static export.
 *
 * There is no image optimiser on Cloudflare Workers Static Assets, so the
 * widths are baked at build time by scripts/bake-images.mjs into
 * /opt/<dir>/<name>.w<width>.webp. This maps a request onto the smallest baked
 * width that covers it. WIDTHS must match `images.deviceSizes` and the script.
 *
 * In dev the baked files may not exist yet, so the original is served as is.
 */
const WIDTHS = [640, 960, 1280, 1920];
const BAKED = /^\/(work)\/[^/]+\.(webp|png|jpe?g)$/i;

export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }) {
  if (process.env.NODE_ENV !== "production" || !BAKED.test(src)) return src;
  const w = WIDTHS.find((x) => x >= width) ?? WIDTHS[WIDTHS.length - 1];
  return `/opt${src.replace(/\.[^.]+$/, "")}.w${w}.webp`;
}
