"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
// Local dev starts with the draft gate in SSR too, so the ink intro cannot
// briefly start before hydration resolves a localhost query parameter.
const server = () => process.env.NODE_ENV === "development" ? "cinematic" : "off";
function snapshot() {
  if (!["localhost", "127.0.0.1"].includes(window.location.hostname)) return "off";
  const value = new URLSearchParams(window.location.search).get("draft") ?? "cinematic";
  return ["cinematic", "vinyl", "masters", "ink", "off"].includes(value) ? value : "off";
}

/** Drafts are restricted to loopback; query links let the owner compare gates. */
export function useLocalDraft() {
  return useSyncExternalStore(subscribe, snapshot, server);
}
