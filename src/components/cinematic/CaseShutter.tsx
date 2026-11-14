"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { type GateRequest } from "@/lib/neonGate";
import { useLockScroll } from "@/hooks/useLockScroll";
import { useI18n } from "@/lib/i18n";

/** Same gate contract as the original; only the visual transition changes. */
export function CaseShutter({ req, onDone }: { req: GateRequest; onDone: () => void }) {
  const { c } = useI18n();
  const [covered, setCovered] = useState(false);
  const request = useRef(req);
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; }, [onDone]);
  useLockScroll(true);
  useEffect(() => {
    let live = true;
    let opened = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const finish = () => {
      if (!live || opened) return;
      opened = true;
      request.current.onCovered();
      setCovered(true);
      timers.push(setTimeout(() => { request.current.resolve(); done.current(); }, 650));
    };
    const project = c.projects.find((item) => item.slug === request.current.slug);
    const urls = [project?.shot, ...(project?.gallery?.map((image) => image.src) ?? [])].filter((url): url is string => !!url);
    const pictures = urls.map((url) => { const image = new Image(); image.src = url; return image.decode().catch(() => {}); });
    Promise.all([Promise.all(pictures), new Promise((resolve) => { timers.push(setTimeout(resolve, 450)); })]).then(finish);
    timers.push(setTimeout(finish, 2400));
    return () => { live = false; timers.forEach(clearTimeout); };
    // A request's project is fixed until the shutter unmounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div className="cin-case-shutter" aria-hidden>
    {[0, 1].map((side) => <motion.div key={side} className="cin-shutter-leaf" data-side={side}
      initial={{ x: side ? "100%" : "-100%" }} animate={{ x: covered ? (side ? "100%" : "-100%") : "0%" }}
      transition={{ duration: covered ? .65 : .4, ease: [.7,0,.2,1] }} />)}
  </div>;
}
