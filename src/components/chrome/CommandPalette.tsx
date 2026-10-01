"use client";

import { toggleDiagnostics } from "@/lib/diagnostics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Languages, Zap } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { openCase } from "@/lib/caseFile";
import { useSmoothScroll } from "@/components/chrome/SmoothScroll";
import { useOverlay } from "@/hooks/useOverlay";
import { isTextEntry, modalOpen } from "@/lib/keys";
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
  group: string;
  run: () => void;
  /** Rendered instead of the hint when present — for the toggle's state. */
  state?: string;
}

export function CommandPalette() {
  const { c, t, locale, setLocale, available } = useI18n();
  const { navLinks, projects, contact } = c;
  const router = useRouter();
  const pathname = usePathname();
  const { scrollTo } = useSmoothScroll();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [copied, setCopied] = useState(false);
  const [lowPower, setLowPower] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

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
      group: t.palette.sections,
      run: () => go(l.href),
    }));

    const files: Command[] = projects.map((p) => ({
      id: `p-${p.slug}`,
      label: p.title,
      hint: p.category,
      group: t.palette.caseFiles,
      run: () => openCase(p.slug),
    }));

    const actions: Command[] = [
      {
        id: "a-copy",
        label: t.palette.copyEmail,
        hint: contact.email,
        group: t.palette.actions,
        run: () => {
          navigator.clipboard?.writeText(contact.email);
          setCopied(true);
        },
      },
      {
        id: "a-power",
        label: t.palette.lowPower,
        state: lowPower ? t.palette.on : t.palette.off,
        group: t.palette.actions,
        /* Writes the attribute the whole site reads (useQuality watches it),
           rather than threading a value through a provider nothing else needs. */
        run: () => {
          const next = !lowPower;
          setLowPower(next);
          document.documentElement.dataset.power = next ? "low" : "";
        },
      },
    ];

    /* The diagnostics readout — the same toggle as the backquote key. */
    actions.push({
      id: "a-diag",
      label: t.palette.diagnostics,
      hint: "`",
      group: t.palette.actions,
      run: () => toggleDiagnostics(),
    });

    /* Offered in the *other* language's own words — someone who needs the
       switch may not read the language the site is currently in. */
    if (available.length > 1) {
      const other = available.find((l) => l !== locale);
      if (other) {
        actions.push({
          id: "a-lang",
          label: t.palette.language,
          hint: t.lang[other],
          group: t.palette.actions,
          run: () => setLocale(other),
        });
      }
    }

    return [...sections, ...files, ...actions];
  }, [go, lowPower, navLinks, projects, contact, t, locale, setLocale, available]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((cmd) =>
      `${cmd.label} ${cmd.hint ?? ""} ${cmd.group}`.toLowerCase().includes(q)
    );
  }, [commands, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setCursor(0);
    setCopied(false);
    /* Focus restoration is the hook's, not ours — it holds the `isConnected`
       guard and the `preventScroll` that a bare `.focus()` here didn't. */
  }, []);

  /* Trap, Escape, restore and the scroll lock. `restoreFocus` has to be passed
     explicitly: it is captured in the shortcut handler *before* `open` flips,
     because ⌘K fires while focus is still on whatever you were reading, and by
     the time the hook's effect runs the input already has it. */
  useOverlay({
    open,
    onClose: close,
    ref: panelRef,
    initialFocus: inputRef,
    restoreFocus,
  });

  /* Global shortcuts. Deliberately inert while the caret is in a text field —
     otherwise "/" becomes impossible to type in the contact form. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      /* Another overlay owns the keyboard while it is up. Without this, "/"
         opened the palette *underneath* an open dossier — two `aria-modal`
         dialogs and two scroll locks stacked, with the trap of the one you
         couldn't see fighting the one you could. */
      if (!open && modalOpen()) return;

      const el = document.activeElement as HTMLElement | null;
      const typing = isTextEntry(el);

      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        /* Not a `setOpen(v => !v)` toggle. Closing has to run `close()` so the
           query, the cursor and the copied flag reset and focus goes back —
           the toggle skipped all of it, so ⌘K-to-dismiss left the palette's
           state dirty for the next open. */
        if (open) {
          close();
        } else {
          restoreFocus.current = el ?? null;
          setOpen(true);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    /* Escape is the hook's, on document in the capture phase. */
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
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={t.palette.aria}
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
              {/* A terminal's prompt, in sodium, where a search glass was. */}
              <span aria-hidden className="shrink-0 font-mono text-sm text-[var(--color-hazard)]">
                &gt;_
              </span>
              <input
                ref={inputRef}
                /* No `autoFocus`. The overlay hook owns initial focus for all
                   four surfaces, and React's autoFocus scrolls the document to
                   the element — under a held Lenis lock that desyncs the pins. */
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCursor(0);
                }}
                onKeyDown={onKeyDown}
                placeholder={t.palette.placeholder}
                aria-label={t.palette.search}
                /* Combobox + listbox rather than aria-selected on a button:
                   the roles have to describe the list, and `button` does not
                   support aria-selected. */
                role="combobox"
                aria-expanded
                aria-controls="palette-results"
                aria-activedescendant={results[cursor]?.id}
                /* Negative offset, not `outline-none`. The global ring is
                   unlayered, so it outranks `outline-none` and drew anyway —
                   at the default +3px it crowds the panel edge and the
                   `chamfer-lg` clip-path is waiting to slice it. Inset, the
                   ring reads as the field's own frame.

                   The `!` is not optional and not a shortcut: `:focus-visible`
                   in globals.css is deliberately unlayered so that *every*
                   focusable element gets a ring, and unlayered CSS outranks
                   every cascade layer — so a plain utility here loses no
                   matter what its specificity is. Same hazard the two `@layer
                   base` comments in that file describe. */
                className="w-full bg-transparent py-4 font-mono text-sm text-fg caret-[var(--color-hazard)] placeholder:text-faint focus-visible:[outline-offset:-4px]!"
              />
              <kbd className="hud-label shrink-0 border border-line px-1.5 py-0.5">
                ESC
              </kbd>
            </div>

            <ul id="palette-results" role="listbox" aria-label={t.palette.results} className="max-h-[46vh] overflow-y-auto py-2">
              {results.length === 0 && (
                <li className="px-5 py-6 text-sm text-muted">
                  {t.palette.none(query)}
                </li>
              )}
              {results.map((cmd, i) => {
                const header = cmd.group !== lastGroup ? cmd.group : null;
                lastGroup = cmd.group;
                return (
                  <li key={cmd.id} id={cmd.id} role="option" aria-selected={i === cursor}>
                    {header && (
                      <p className="micro px-5 pb-1 pt-3">{header}</p>
                    )}
                    <button
                      type="button"
                      onMouseEnter={() => setCursor(i)}
                      onClick={() => {
                        cmd.run();
                        if (cmd.id !== "a-power" && cmd.id !== "a-copy") close();
                      }}
                      tabIndex={-1}
                      className={cn(
                        "relative flex w-full items-center justify-between gap-4 px-5 py-2.5 text-left transition-colors",
                        i === cursor ? "bg-fg/[0.07] text-fg" : "text-muted"
                      )}
                    >
                      {/* The selection: a lit bar that slides between rows. */}
                      {i === cursor && (
                        <motion.span
                          layoutId="palette-cursor"
                          aria-hidden
                          className="absolute inset-y-1 left-0 w-[2px] bg-[var(--color-hazard)] shadow-[0_0_10px_var(--color-hazard)]"
                          transition={{ type: "spring", stiffness: 520, damping: 40 }}
                        />
                      )}
                      <span className="flex items-center gap-3">
                        {cmd.id === "a-power" && <Zap size={14} />}
                        {cmd.id === "a-lang" && <Languages size={14} />}
                        {cmd.id === "a-copy" &&
                          (copied ? <Check size={14} /> : <Copy size={14} />)}
                        <span className="font-tech text-sm font-semibold uppercase">
                          {cmd.id === "a-copy" && copied ? t.palette.copiedEmail : cmd.label}
                        </span>
                      </span>
                      <span
                        className="micro tabular shrink-0"
                        style={
                          cmd.state === t.palette.on
                            ? { color: "var(--color-hazard)" }
                            : undefined
                        }
                      >
                        {cmd.state ?? cmd.hint}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="flex items-center justify-between border-t border-line px-5 py-2.5">
              <span className="micro">{t.palette.keys}</span>
              <span className="micro tabular">{t.palette.count(results.length)}</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
