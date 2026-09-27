"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { en, type Locale, type SiteContent } from "@/lib/content";
import { mn } from "@/lib/content.mn";
import { ui, type UiStrings } from "@/lib/ui";

/**
 * Language, as one client context.
 *
 * **Resolution order** — an explicit `?lang=` wins (so the Mongolian resume can
 * link straight to the Mongolian site), then the visitor's own earlier choice,
 * then the browser's language, then English.
 *
 * **Why the server always renders English.** The page is static; there is no
 * request to read `Accept-Language` from. Rendering English and switching after
 * mount would normally flash, but the preloader holds an opaque curtain over the
 * first ~1.7s, and the switch lands long before it lifts — so a Mongolian
 * visitor never sees the English frame.
 *
 * `<html lang>` follows the locale. That is not only for screen readers: the
 * Cyrillic font swap in globals.css keys off `:lang(mn)`, so this one attribute
 * is what changes the faces too.
 */

const STORAGE_KEY = "locale";

const content: Record<Locale, SiteContent | undefined> = { en, mn };

interface I18n {
  locale: Locale;
  setLocale: (next: Locale) => void;
  /** Every locale that has a complete translation. */
  available: Locale[];
  c: SiteContent;
  t: UiStrings;
}

const available = (["en", "mn"] as Locale[]).filter((l) => content[l] && ui[l]);

const I18nContext = createContext<I18n>({
  locale: "en",
  setLocale: () => {},
  available,
  c: en,
  t: ui.en,
});

function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (available as string[]).includes(v);
}

function detect(): Locale {
  try {
    const param = new URLSearchParams(window.location.search).get("lang");
    if (isLocale(param)) return param;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (isLocale(saved)) return saved;
  } catch {
    /* Storage can throw in private windows; fall through to the browser. */
  }
  const nav = navigator.languages?.length ? navigator.languages : [navigator.language];
  if (nav.some((l) => l?.toLowerCase().startsWith("mn")) && isLocale("mn")) return "mn";
  return "en";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  /* One-shot detection on mount — the browser is the only place the inputs
     exist. Runs before the preloader lifts (see header). */
  useEffect(() => {
    const found = detect();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (found !== "en") setLocaleState(found);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    if (!isLocale(next)) return;
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
      /* Drop a stale `?lang=` so it does not override the choice just made on
         the next reload. */
      const url = new URL(window.location.href);
      if (url.searchParams.has("lang")) {
        url.searchParams.delete("lang");
        window.history.replaceState(window.history.state, "", url);
      }
    } catch {
      /* Non-persistent is fine; the switch itself already happened. */
    }
  }, []);

  const value = useMemo<I18n>(
    () => ({
      locale,
      setLocale,
      available,
      c: content[locale] ?? en,
      t: ui[locale] ?? ui.en,
    }),
    [locale, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  return useContext(I18nContext);
}
