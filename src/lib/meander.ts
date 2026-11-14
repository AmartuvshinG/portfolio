const r2 = (v: number) => Math.round(v * 100) / 100;

/**
 * A meander key (the Mongolian *alkhan khee*) bent round a circle, as one
 * continuous path. Each unit is a hook drawn in band coordinates (u along the
 * ring, v across it). Strokes along the ring become arcs; strokes across it
 * become lines. Geometry after the Old Masters preloader reference's meander.
 */
export function meanderRing(cx: number, cy: number, r: number, depth: number, units: number): string {
  const n = Math.max(4, Math.floor(units));
  const unit = (Math.PI * 2) / n;
  const hook = [[0, 0], [0, 3], [4, 3], [4, 2], [2, 2], [2, 0], [6, 0]];
  const at = (u: number, v: number) => {
    const a = -Math.PI / 2 + (u / 6) * unit;
    const rr = r + (v / 3 - 0.5) * depth;
    return [r2(cx + Math.cos(a) * rr), r2(cy + Math.sin(a) * rr), r2(rr)];
  };
  let d = "";
  let prevV = 0;
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < hook.length; k++) {
      if (i > 0 && k === 0) continue;
      const [hu, hv] = hook[k];
      const [x, y, rr] = at(i * 6 + hu, hv);
      if (i === 0 && k === 0) d = `M${x} ${y}`;
      else if (hv === prevV) d += ` A${rr} ${rr} 0 0 1 ${x} ${y}`;
      else d += ` L${x} ${y}`;
      prevV = hv;
    }
  }
  return d;
}
