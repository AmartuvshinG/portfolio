/**
 * The Path's landing photos: what the ground looked like at each stop.
 *
 * Baked by scripts/bake-path-photos.mjs into public/path/photos/<key>-<w>.webp.
 * Each one lands with its own reveal (path/PhotoPlate), drawn from what is in
 * the picture: the ШУТИС facade resolves out of the globe's own diodes, the
 * GANNON sign opens as an iris, the Chick-fil-A doors close on the cow, a scan
 * runs across Zurn, Victor's sword cuts his frame, and the camera tilts up
 * Monnis Tower. The Journey adds four of its own (the arch, Erie from the air,
 * the autumn tower, I-HACK) so every entry has a picture of its own.
 */

export type PhotoKey =
  | "must"
  | "gannon"
  | "chickfila"
  | "zurn"
  | "victor"
  | "monnis"
  | "gannon-arc"
  | "erie-aerial"
  | "gannon-autumn"
  | "ihack-tower";
export type RevealKind = "diode" | "iris" | "doors" | "scan" | "slash" | "tilt";

export interface PathPhoto {
  /** The widths baked, smallest first; the last is the source width or 1280. */
  widths: number[];
  /** Width over height. */
  aspect: number;
  /** The widest it is drawn, CSS px: half the largest bake, so sharp at DPR 2. */
  maxCss: number;
  reveal: RevealKind;
  /** Where the reveal opens from, 0–1 of the frame (the iris; the doors' seam). */
  focus: { x: number; y: number };
}

export const PHOTOS: Record<PhotoKey, PathPhoto> = {
  must: { widths: [640, 1280], aspect: 2048 / 1152, maxCss: 640, reveal: "diode", focus: { x: 0.5, y: 0.5 } },
  /* The GANNON plaque, low in the middle. */
  gannon: { widths: [640, 1200], aspect: 1200 / 800, maxCss: 600, reveal: "iris", focus: { x: 0.48, y: 0.62 } },
  /* The cow stands just left of centre: the doors meet on him. */
  chickfila: { widths: [640, 1280], aspect: 2048 / 1365, maxCss: 640, reveal: "doors", focus: { x: 0.42, y: 0.5 } },
  zurn: { widths: [640, 1280], aspect: 6240 / 3121, maxCss: 640, reveal: "scan", focus: { x: 0.5, y: 0.5 } },
  victor: { widths: [640, 1040], aspect: 1040 / 500, maxCss: 520, reveal: "slash", focus: { x: 0.5, y: 0.5 } },
  monnis: { widths: [640, 900], aspect: 900 / 862, maxCss: 450, reveal: "tilt", focus: { x: 0.5, y: 1 } },
  /* The Journey's own frames, so no two entries share a picture. The iris
     opens on the arch's lettering. */
  "gannon-arc": { widths: [640, 1200], aspect: 1200 / 901, maxCss: 600, reveal: "iris", focus: { x: 0.5, y: 0.47 } },
  /* A scan runs across the city to the bay. */
  "erie-aerial": { widths: [640, 1200], aspect: 1200 / 600, maxCss: 600, reveal: "scan", focus: { x: 0.5, y: 0.5 } },
  /* The leaves part on the tower's lettering. */
  "gannon-autumn": { widths: [640, 1280], aspect: 2048 / 1365, maxCss: 640, reveal: "doors", focus: { x: 0.49, y: 0.5 } },
  /* Cropped off its pillarbox bars at the bake; the camera tilts up the tower. */
  "ihack-tower": { widths: [596], aspect: 596 / 800, maxCss: 298, reveal: "tilt", focus: { x: 0.5, y: 1 } },
};

export const photoSrc = (key: PhotoKey, w: number) => `/path/photos/${key}-${w}.webp`;

export function photoSrcSet(key: PhotoKey) {
  return PHOTOS[key].widths.map((w) => `${photoSrc(key, w)} ${w}w`).join(", ");
}

/** A reframing of an entry's photo: the same picture, the camera moved in. */
export interface PhotoCrop {
  /** The point brought to the centre, 0–1 of the frame. */
  x: number;
  y: number;
  scale: number;
}
