"use client";

import { useEffect } from "react";
import { useLocalDraft } from "@/hooks/useLocalDraft";
import { isWorldChapter, setWorldFrame } from "@/lib/cinematicWorld";
import "./cinematic.css";

/** The design flag changes once per navigation. Scene progress stays local. */
export function CinematicDesign() {
  const cinematic = useLocalDraft() === "cinematic";
  useEffect(() => {
    if (!cinematic) return;
    document.documentElement.dataset.design = "cinematic";
    const chapters = [...document.querySelectorAll<HTMLElement>("main section[id]")];
    let frame = 0;
    let anchors: { id: string; top: number; height: number }[] = [];
    const measure = () => {
      anchors = chapters.map((section) => ({ id: section.id, top: section.getBoundingClientRect().top + window.scrollY, height: section.offsetHeight }));
    };
    const update = () => {
      frame = 0;
      const line = window.scrollY + window.innerHeight * 0.6;
      const section = [...anchors].reverse().find((item) => line >= item.top) ?? anchors[0];
      if (section && isWorldChapter(section.id)) setWorldFrame({ chapter: section.id, progress: Math.max(0, Math.min(1, (window.scrollY - section.top) / Math.max(1, section.height - window.innerHeight))) });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const remeasure = () => { measure(); schedule(); };
    const resize = new ResizeObserver(remeasure);
    for (const chapter of chapters) resize.observe(chapter);
    measure(); update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", remeasure);
    return () => {
      cancelAnimationFrame(frame); resize.disconnect();
      window.removeEventListener("scroll", schedule); window.removeEventListener("resize", remeasure);
      delete document.documentElement.dataset.design;
    };
  }, [cinematic]);
  return null;
}
