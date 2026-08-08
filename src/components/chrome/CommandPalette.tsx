"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Search, Zap } from "lucide-react";
import { navLinks, projects, contact } from "@/lib/content";
import { useSmoothScroll } from "@/components/chrome/SmoothScroll";
import { useLockScroll } from "@/hooks/useLockScroll";
import { EASE_EXPO } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * ⌘K — the site as a command line.
 *
 * A portfolio with ten sections and a set of case files is a small database,
 * and the fastest interface to a small database is a text field. It also takes
 * the pressure off the navbar: the header no longer has to be the only way to
 * reach anything, which is what let the numbering and the clock come out of the
 * contracted console without losing navigability.
 *
 * Everything it does is something the site could already do — go somewhere,
 * copy the email, drop to low power. It is an accelerator, not a second set of
 * features, which is the only way a palette stays honest.
 *
 * Opens on ⌘K / Ctrl-K and on `/` (the convention people already have from
 * every other search field on the web), and never while a field has focus.
 */

interface Command {
  id: string;
  label: string;
  hint?: string;
  group: "Sections" | "Case files" | "Actions";
  run: () => void;
  /** Rendered instead of the hint when present — for the toggle's state. */
  state?: string;
}

export function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const { scrollTo } = useSmoothScroll();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [copied, setCopied] = useState(false);
  const [lowPower, setLowPower] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

  useLockScroll(open);

  const isHome = pathname === "/";

  const go = useCallback(
    (href: string) => {
      if (isHome) scrollTo(href);
      else router.push(`/${href}`);
    },
    [isHome, scrollTo, router]
  );

  const commands = useMemo<Command[]>(() => {
    const sections: Command[] = navLinks.map((l) => ({
      id: `s-${l.href}`,
      label: l.label,
      hint: l.code,
      group: "Sections",
      run: () => go(l.href),
    }));

    const files: Command[] = projects.map((p) => ({
      id: `p-${p.slug}`,
      label: p.title,
      hint: p.category,
      group: "Case files",
      run: () => router.push(`/work/${p.slug}`),
    }));

    const actions: Command[] = [
      {
        id: "a-copy",
        label: "Copy email address",
        hint: contact.email,
        group: "Actions",
        run: () => {
          navigator.clipboard?.writeText(contact.email);
          setCopied(true);
        },
      },
      {
        id: "a-power",
        label: "Low-power mode",
        state: lowPower ? "ON" : "OFF",
        group: "Actions",
        /* Writes the attribute the whole site reads (useQuality watches it),
           rather than threading a value through a provider nothing else needs. */
        run: () => {
          const next = !lowPower;
          setLowPower(next);
          document.documentElement.dataset.power = next ? "low" : "";
        },
      },
    ];

    return [...sections, ...files, ...actions];
  }, [go, router, lowPower]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) =>
      `${c.label} ${c.hint ?? ""} ${c.group}`.toLowerCase().includes(q)
    );
  }, [commands, query]);

  /* Global shortcuts. Deliberately inert while the caret is in a text field —
     otherwise "/" becomes impossible to type in the contact form. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el?.isContentEditable;

      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        restoreFocus.current = el ?? null;
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setCursor(0);
    setCopied(false);
    restoreFocus.current?.focus?.();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") return close();
    if (e.key === "ArrowDown" || (e.key === "n" && e.ctrlKey)) {
      e.preventDefault();
      setCursor((c) => (results.length ? (c + 1) % results.length : 0));
    }
    if (e.key === "ArrowUp" || (e.key === "p" && e.ctrlKey)) {
      e.preventDefault();
      setCursor((c) => (results.length ? (c - 1 + results.length) % results.length : 0));
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const hit = results[cursor];
      if (!hit) return;
      hit.run();
      /* The toggle is the one command worth staying open for — you want to see
         it flip, and you may well want to flip it back. */
      if (hit.id !== "a-power" && hit.id !== "a-copy") close();
    }
  };

  let lastGroup = "";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[110] flex items-start justify-center bg-void/80 px-5 pt-[12vh]"
          onClick={close}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, y: -12, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.28, ease: EASE_EXPO }}
            onClick={(e) => e.stopPropagation()}
            className="chamfer-lg w-full max-w-2xl overflow-hidden border border-line-strong bg-bg/95 shadow-[0_40px_120px_rgba(0,0,0,0.7)]"
            /* A modal is idle by definition — nothing is scrolling behind it —
               so unlike the navbar this one can hold real glass all the time. */
            style={{ backdropFilter: "blur(20px) saturate(1.3)" }}
          >
            <div className="flex items-center gap-3 border-b border-line px-5">
              <Search size={16} className="shrink-0 text-muted" />
              <input
                ref={inputRef}
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCursor(0);
                }}
                onKeyDown={onKeyDown}
                placeholder="Jump to a section, a case file, or an action…"
                aria-label="Search commands"
                /* Combobox + listbox rather than aria-selected on a button:
                   the roles have to describe the list, and `button` does not
                   support aria-selected. */
                role="combobox"
                aria-expanded
                aria-controls="palette-results"
                aria-activedescendant={results[cursor]?.id}
                className="w-full bg-transparent py-4 font-mono text-sm text-fg outline-none placeholder:text-faint"
              />
              <kbd className="hud-label shrink-0 border border-line px-1.5 py-0.5">
                ESC
              </kbd>
            </div>

            <ul id="palette-results" role="listbox" aria-label="Commands" className="max-h-[46vh] overflow-y-auto py-2">
              {results.length === 0 && (
                <li className="px-5 py-6 text-sm text-muted">
                  Nothing matches “{query}”.
                </li>
              )}
              {results.map((c, i) => {
                const header = c.group !== lastGroup ? c.group : null;
                lastGroup = c.group;
                return (
                  <li key={c.id} id={c.id} role="option" aria-selected={i === cursor}>
                    {header && (
                      <p className="micro px-5 pb-1 pt-3">{header}</p>
                    )}
                    <button
                      type="button"
                      onMouseEnter={() => setCursor(i)}
                      onClick={() => {
                        c.run();
                        if (c.id !== "a-power" && c.id !== "a-copy") close();
                      }}
                      tabIndex={-1}
                      className={cn(
                        "flex w-full items-center justify-between gap-4 px-5 py-2.5 text-left transition-colors",
                        i === cursor ? "bg-fg/[0.07] text-fg" : "text-muted"
                      )}
                    >
                      <span className="flex items-center gap-3">
                        {c.id === "a-power" && <Zap size={14} />}
                        {c.id === "a-copy" &&
                          (copied ? <Check size={14} /> : <Copy size={14} />)}
                        <span className="font-tech text-sm font-semibold uppercase">
                          {c.id === "a-copy" && copied ? "Copied" : c.label}
                        </span>
                      </span>
                      <span
                        className="micro tabular shrink-0"
                        style={
                          c.state === "ON"
                            ? { color: "var(--color-hazard)" }
                            : undefined
                        }
                      >
                        {c.state ?? c.hint}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="flex items-center justify-between border-t border-line px-5 py-2.5">
              <span className="micro">↑↓ move · ↵ select · esc close</span>
              <span className="micro tabular">{results.length} results</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
