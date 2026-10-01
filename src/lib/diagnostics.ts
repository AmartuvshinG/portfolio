"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether the diagnostics panel is up. A module flag plus
 * useSyncExternalStore (like useBootReady): written by the backquote key and
 * by the ⌘K palette, read by the panel, nothing else.
 */

let open = false;
const listeners = new Set<() => void>();

export function setDiagnostics(next: boolean) {
  if (next === open) return;
  open = next;
  for (const l of listeners) l();
}

export function toggleDiagnostics() {
  setDiagnostics(!open);
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function useDiagnosticsOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => open,
    () => false
  );
}
