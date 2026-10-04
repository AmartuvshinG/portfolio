/**
 * One stroke weight for every line icon, the way SF Symbols does it.
 *
 * Lucide draws on a 24-unit grid and scales the stroke with the icon, so the
 * same `strokeWidth` is a hairline at 14px and a marker at 64px, and the
 * call sites had drifted between 1.25 and 2 (the default) with no rule. Apple's
 * rule is that a symbol's weight matches the text beside it and its stroke
 * thins, relative to the glyph, as the glyph grows, so a small icon beside a
 * label and a large one in a tile read as the same weight of line.
 *
 * `size` is the rendered size in px. `weight` follows the neighbouring text:
 * "regular" beside body copy and labels, "light" for large decorative glyphs,
 * "medium" beside semibold headings and buttons.
 */
export type IconWeight = "light" | "regular" | "medium";

const SCALE: Record<IconWeight, number> = { light: 0.85, regular: 1, medium: 1.15 };

export function iconStroke(size: number, weight: IconWeight = "regular"): number {
  /* Grid units, falling with size; rendered px still rise slowly
     (1.3px at 14, 1.6px at 24, 2.4px at 64), as SF's scales do. */
  const units = size <= 16 ? 2.2 : size <= 20 ? 1.85 : size <= 24 ? 1.6 : size <= 32 ? 1.45 : size <= 44 ? 1.25 : 0.9;
  return Math.round(units * SCALE[weight] * 100) / 100;
}
