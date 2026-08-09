/**
 * Shared keyboard predicates.
 *
 * `ChapterKeys` and `CommandPalette` both listen on the window and both have to
 * answer the same three questions — is the user typing, are they operating a
 * control, is a modal already up. They each answered them differently, and the
 * disagreements were the bugs: `/` opened the palette *underneath* an open
 * dossier, and the arrow keys were stolen from focused links.
 *
 * These are deliberately free functions over `document`, not a hook or a
 * context. The state they describe is the DOM's, and reading it at keydown
 * time is both cheaper and more truthful than mirroring it into React.
 */

/** True while the caret is in something that accepts text. */
export function isTextEntry(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLElement && el.isContentEditable) return true;
  if (el instanceof HTMLInputElement) {
    /* Not every input takes text. A focused checkbox or radio should still let
       `j`/`k` through — space and the arrows are theirs, letters are not. */
    const type = el.type.toLowerCase();
    return !["checkbox", "radio", "button", "submit", "reset", "file", "range"].includes(
      type
    );
  }
  return false;
}

/**
 * True when focus is on *anything* the user is operating, rather than on the
 * document itself.
 *
 * This is the test that decides who owns the arrow keys. `document.body` /
 * `documentElement` / `null` is precisely the "reading, not operating a
 * control" state — everything else, including a link, belongs to the browser.
 */
export function isInteractive(el: Element | null): boolean {
  if (!el) return false;
  if (el === document.body || el === document.documentElement) return false;
  if (isTextEntry(el)) return true;
  if (
    el.matches(
      "a[href], button, input, textarea, select, summary, audio[controls], video[controls]"
    )
  )
    return true;
  const tabindex = el.getAttribute("tabindex");
  if (tabindex !== null && tabindex !== "-1") return true;
  return Boolean(el.closest("[role='dialog'], [role='listbox'], [role='menu']"));
}

/** True while any modal dialog is mounted, whoever owns it. */
export function modalOpen(): boolean {
  return Boolean(document.querySelector('[role="dialog"][aria-modal="true"]'));
}
