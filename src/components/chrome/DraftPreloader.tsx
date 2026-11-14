"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useI18n } from "@/lib/i18n";
import { useLockScroll } from "@/hooks/useLockScroll";
import { markBooted } from "@/hooks/useBootReady";
import { useIntroReplays } from "@/lib/intro";
import { INK_NAME } from "@/lib/inkName";
import styles from "./DraftPreloader.module.css";

const subscribeMotion = (notify: () => void) => {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};
const motionSnapshot = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const serverMotion = () => false;

export function DraftPreloader({ mode }: { mode: string }) {
  const replay = useIntroReplays();
  return <Gate key={`${mode}-${replay}`} mode={mode} />;
}

/** Adaptations of the supplied vinyl and Old Masters gates. One finite intro,
 * existing identity, no remote fonts, no pointer parallax or fullscreen shader.
 * Progress is the intro's elapsed sequence, not a fabricated network metric. */
function Gate({ mode }: { mode: string }) {
  const { c, t } = useI18n();
  const reduced = useSyncExternalStore(subscribeMotion, motionSnapshot, serverMotion);
  const [phase, setPhase] = useState<"loading" | "exit" | "done">("loading");
  const [progress, setProgress] = useState(0);
  const exiting = useRef(false);
  const enter = useRef<HTMLButtonElement>(null);
  const complete = useCallback(() => {
    if (exiting.current) return;
    exiting.current = true;
    setProgress(100);
    markBooted();
    setPhase("exit");
  }, []);
  useLockScroll(phase !== "done" && !reduced);
  useEffect(() => {
    if (reduced) { markBooted(); return; }
    if (phase !== "loading") return;
    enter.current?.focus({ preventScroll: true });
    const start = performance.now();
    const timer = window.setInterval(() => {
      const pct = Math.min(100, (performance.now() - start) / 32);
      setProgress(Math.round(pct));
      if (pct >= 100) complete();
    }, 60);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Tab") { event.preventDefault(); enter.current?.focus(); return; }
      event.preventDefault(); event.stopImmediatePropagation(); complete();
    };
    window.addEventListener("keydown", onKey, true);
    return () => { clearInterval(timer); window.removeEventListener("keydown", onKey, true); };
  }, [complete, reduced, phase]);
  useEffect(() => {
    if (phase !== "exit") return;
    const timer = setTimeout(() => setPhase("done"), 750);
    return () => clearTimeout(timer);
  }, [phase]);
  if (phase === "done" || reduced) return null;
  const masters = mode === "masters";
  const stages = [t.preloader.loading, t.preloader.writing, t.preloader.ready];
  return <div role="dialog" aria-modal="true" aria-label={t.draft.intro} className={`preloader ${styles.gate}`} data-mode={masters ? "masters" : "vinyl"} data-phase={phase}>
    <div className={styles.top}><span>{c.profile.wordmark}</span><span>{t.preloader.reel}</span></div>
    {masters ? <div className={styles.masters} aria-hidden="true">
      <div className={styles.orbit} />
      <div className={styles.signature} style={{ maskImage: `url(${INK_NAME.mask})`, WebkitMaskImage: `url(${INK_NAME.mask})` }} />
      <div className={styles.masterWord}>{c.profile.wordmark}</div>
      <div className={styles.masterRule} style={{ transform: `scaleX(${progress / 100})` }} />
    </div> : <div className={styles.vinyl} aria-hidden="true">
      <div className={styles.record}>
        <div className={styles.label}><span>{c.profile.role}</span><strong>{c.profile.wordmark}</strong><span>{t.preloader.reel}</span><i /></div>
      </div>
      <div className={styles.burst} />
      <div className={styles.stages}>{stages.map((stage, i) => <div key={stage} data-lit={i === Math.min(2, Math.floor(progress / 34))}><span>0{i + 1}</span>{stage}</div>)}</div>
    </div>}
    <div className={styles.bottom}>
      <div role="progressbar" aria-label={t.draft.intro} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span className={styles.number}>{String(progress).padStart(3, "0")}</span><span className="tag"> / 100</span></div>
      <button ref={enter} type="button" onClick={complete}>{t.draft.enter}<span aria-hidden="true"> ↗</span></button>
    </div>
  </div>;
}
