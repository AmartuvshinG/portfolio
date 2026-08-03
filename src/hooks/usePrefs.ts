"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

/**
 * Tiny global store for the viewer's HUD preferences, shared by the console
 * dock (which toggles them) and the effects themselves (which read them).
 *
 * Deliberately not a React context: `AmbientOverlay` is a server component and
 * `HudCursor` is a fixed sibling, so threading a provider through them would
 * mean turning static markup into client markup for two booleans. Instead the
 * store mirrors its state onto `<html data-*>` so pure-CSS consumers can react
 * without any JS at all.
 */

export type PrefKey = "cursor" | "ambient";

const STORAGE_KEY = "nexus-prefs";
const defaults: Record<PrefKey, boolean> = { cursor: true, ambient: true };

let state: Record<PrefKey, boolean> = { ...defaults };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function reflect() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  (Object.keys(state) as PrefKey[]).forEach((k) => {
    root.dataset[k] = state[k] ? "on" : "off";
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setPref(key: PrefKey, value: boolean) {
  if (state[key] === value) return;
  state = { ...state, [key]: value };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — preference is session-only */
  }
  reflect();
  emit();
}

/** Reads a preference. Returns the default during SSR and first paint. */
export function usePref(key: PrefKey): boolean {
  return useSyncExternalStore(
    subscribe,
    () => state[key],
    () => defaults[key]
  );
}

export function useTogglePref(key: PrefKey) {
  const value = usePref(key);
  return useCallback(() => setPref(key, !value), [key, value]);
}

/**
 * Restores persisted preferences once, after hydration. Mounted by the console
 * dock — reading storage during render would desync server and client markup.
 */
export function usePrefsHydration() {
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) state = { ...defaults, ...JSON.parse(raw) };
    } catch {
      /* ignore malformed storage */
    }
    reflect();
    emit();
  }, []);
}
