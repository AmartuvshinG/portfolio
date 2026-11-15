"use client";

import { useEffect, useRef } from "react";

/**
 * Local time in Ulaanbaatar, HH:MM:SS, written into one text node once a
 * second; it never re-renders. The server renders a placeholder, so hydration
 * always agrees. Used by the ID card and the Contact panel.
 */
export function LocalClock({ className }: { className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ulaanbaatar",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const tick = () => {
      if (ref.current) ref.current.textContent = fmt.format(new Date());
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span ref={ref} className={className ? `tabular ${className}` : "tabular"}>
      --:--:--
    </span>
  );
}
