"use client";

import { useEffect } from "react";
import { useScramble } from "@/hooks/useScramble";

/** A value that decodes once, `delay` seconds after `play` turns true (the ID
 *  card's fields as its scan reaches them, the hero panel's rows as it
 *  arrives). The accessible text is a separate sr-only copy, so nothing ever
 *  hears the scramble. */
export function DecodeText({ text, play, delay }: { text: string; play: boolean; delay: number }) {
  const { ref, run } = useScramble(text);
  useEffect(() => {
    if (!play) return;
    const id = window.setTimeout(run, delay * 1000);
    return () => window.clearTimeout(id);
  }, [play, delay, run]);
  return (
    <>
      <span className="sr-only">{text}</span>
      <span ref={ref} aria-hidden>
        {text}
      </span>
    </>
  );
}
