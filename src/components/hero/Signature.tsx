"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { InkSign } from "@/components/ui/InkSign";
import { INK_NAME } from "@/lib/inkName";

/**
 * The hero's signature: his name in Mongol bichig, brushed in light across
 * the printed Latin name the way a signature crosses a typed one, then flown
 * into the sign at the frame's edge.
 *
 *   1.6s   the signature writes over the name (the same InkSign, laid on its
 *          side like the footer ticker, tilted a little, ~55% of the name's
 *          width, a touch below its midline)
 *   ~6s    the write settles, and the signature flies into the edge sign:
 *          one WAAPI transform, 1.1s. On landing the edge sign lights
 *          already written (no stutter) and this layer unmounts.
 *
 * Below md the edge sign is hidden, so the signature fades out where it was
 * written instead. Mounted only when motion is allowed; under reduced motion
 * the edge sign is simply lit.
 *
 * Nothing here follows the pointer. It plays once and leaves nothing running.
 */

/** When the signature starts, ms after the curtain starts to lift. */
const WRITE_AT = 1600;
/** If the write never reports back (the visitor left mid-write), go anyway. */
const WRITE_TIMEOUT = 7000;
const FLY_MS = 1100;
/** Laid on its side and tilted, like a signature. */
const ROT = -96;
/** Under the tube's white, so the name stays readable through it. */
const OVER_NAME = 0.8;

type Stage = "wait" | "write" | "fly" | "done";

export function Signature({
  play,
  nameRef,
  targetRef,
  onLanded,
}: {
  play: boolean;
  /** The name's box: the signature's length is a share of its width. */
  nameRef: RefObject<HTMLElement | null>;
  /** The edge sign's InkSign box: where the signature lands. */
  targetRef: RefObject<HTMLElement | null>;
  onLanded: () => void;
}) {
  const [stage, setStage] = useState<Stage>("wait");
  const [len, setLen] = useState(0);
  const flyerRef = useRef<HTMLDivElement>(null);
  const landedRef = useRef(onLanded);
  useEffect(() => {
    landedRef.current = onLanded;
  });

  useEffect(() => {
    if (!play) return;
    const id = window.setTimeout(() => {
      const name = nameRef.current;
      setLen(name ? name.offsetWidth * 0.55 : 0);
      setStage("write");
    }, WRITE_AT);
    return () => window.clearTimeout(id);
  }, [play, nameRef]);

  useEffect(() => {
    if (stage !== "write") return;
    const id = window.setTimeout(() => setStage("fly"), WRITE_TIMEOUT);
    return () => window.clearTimeout(id);
  }, [stage]);

  /* The flight. Measured now, not on mount: the edge sign rides the copy's
     scroll transform and the name drifts. */
  useEffect(() => {
    if (stage !== "fly") return;
    const el = flyerRef.current;
    const target = targetRef.current;
    const land = () => {
      landedRef.current();
      setStage("done");
    };
    if (!el) return land();

    let anim: Animation;
    if (!target || target.getClientRects().length === 0) {
      // No edge sign on this screen: fade out where it was written.
      anim = el.animate([{ opacity: OVER_NAME }, { opacity: 0 }], {
        duration: 700,
        easing: "ease-out",
        fill: "forwards",
      });
    } else {
      const from = el.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      /* The flyer sits inside the name's scaled, drifting plane; the
         translate is written in that plane's units. */
      const parent = el.offsetParent as HTMLElement | null;
      const k = parent && parent.offsetWidth ? parent.getBoundingClientRect().width / parent.offsetWidth : 1;
      const dx = (to.left + to.width / 2 - (from.left + from.width / 2)) / k;
      const dy = (to.top + to.height / 2 - (from.top + from.height / 2)) / k;
      const s = target.offsetHeight / Math.max(1, el.offsetHeight) / k;
      const base = "translate(-50%, -50%)";
      anim = el.animate(
        [
          { transform: `${base} translate(0px, 0px) rotate(${ROT}deg) scale(1)`, opacity: OVER_NAME },
          { transform: `${base} translate(${dx}px, ${dy}px) rotate(0deg) scale(${s})`, opacity: 1 },
        ],
        { duration: FLY_MS, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" }
      );
    }
    anim.onfinish = land;
    return () => {
      anim.onfinish = null;
      anim.cancel();
    };
  }, [stage, targetRef]);

  if (stage === "wait" || stage === "done" || !len) return null;

  return (
    <div
      ref={flyerRef}
      aria-hidden
      className="signature-flyer pointer-events-none absolute left-1/2 top-[60%] z-20"
      style={{
        height: len,
        width: (len * INK_NAME.width) / INK_NAME.height,
        transform: `translate(-50%, -50%) rotate(${ROT}deg)`,
        opacity: OVER_NAME,
      }}
    >
      <InkSign tone="neon" lit="write" className="h-full" onWritten={() => setStage("fly")} />
    </div>
  );
}
