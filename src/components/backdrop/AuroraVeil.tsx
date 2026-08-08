import { cn } from "@/lib/utils";

/**
 * Aurora ribbons, over the neural field.
 *
 * Two repeating linear gradients at different scales sliding past each other —
 * one chromatic, one a black comb that cuts it into bands. Heavily blurred and
 * screened, so what survives is broad diagonal curtains of colour rather than
 * stripes.
 *
 * It is a *veil*, not a background: the shader underneath is the subject, and
 * this sits on top at low opacity to give the field some large-scale structure
 * the per-pixel noise cannot produce on its own. Masked to the top-right so it
 * never closes over the whole frame.
 *
 * CSS-only and zero-JS on purpose — a second fullscreen shader for this would
 * double the GPU cost of the backdrop to add an effect that is fundamentally
 * two moving gradients.
 */
export function AuroraVeil({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute -inset-[10px] overflow-hidden",
        className
      )}
    >
      {/* Oversized so the transform-driven drift never exposes an edge — see
          `.aurora-veil` in globals.css for why it moved off background-position. */}
      <div className="aurora-veil absolute -inset-x-1/3 -inset-y-1/4" />
    </div>
  );
}
