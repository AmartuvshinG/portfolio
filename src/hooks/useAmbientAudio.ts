"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Optional ambient drone. OFF by default and never autoplays — the AudioContext
 * is only constructed inside the user's click handler, which is a valid
 * gesture. The pad is synthesised with WebAudio (three detuned oscillators
 * through a lowpass, with a slow amplitude LFO so it breathes), so there is no
 * audio asset to ship and nothing to download.
 *
 * Extracted from the old standalone AudioToggle button so the console dock can
 * own the control surface while this owns the engine.
 */
export function useAmbientAudio() {
  const [on, setOn] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const build = useCallback(() => {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;
    filter.connect(master);

    [55, 55.4, 82.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 2 ? "triangle" : "sawtooth";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = i === 2 ? 0.15 : 0.4;
      osc.connect(g).connect(filter);
      osc.start();
    });

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.015;
    lfo.connect(lfoGain).connect(master.gain);
    lfo.start();

    master.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 1.2);
    ctxRef.current = ctx;
    gainRef.current = master;
  }, []);

  const toggle = useCallback(() => {
    if (!on) {
      const ctx = ctxRef.current;
      if (!ctx) {
        build();
      } else {
        void ctx.resume();
        gainRef.current?.gain.linearRampToValueAtTime(
          0.04,
          ctx.currentTime + 0.8
        );
      }
      setOn(true);
      return;
    }

    const ctx = ctxRef.current;
    if (ctx && gainRef.current) {
      gainRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      setTimeout(() => void ctx.suspend(), 600);
    }
    setOn(false);
  }, [on, build]);

  useEffect(() => {
    return () => {
      void ctxRef.current?.close();
    };
  }, []);

  return { on, toggle };
}
