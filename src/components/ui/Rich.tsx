import { Fragment } from "react";

/**
 * Copy with its key phrase lit.
 *
 * Content strings mark the phrase that matters with double brackets:
 * "Built [[a bug triage pipeline]] with two teammates." The marked words
 * render as `<strong class="hl">` (the ramp as the text fill, bold); the rest
 * stays as written. A string with no brackets renders unchanged, so this is
 * safe to wrap around any copy.
 *
 * `plain()` strips the marks for places that need text only (aria labels,
 * meta tags, ghost lines).
 */
const MARK = /\[\[(.+?)\]\]/g;

export function Rich({ text }: { text: string }) {
  if (!text.includes("[[")) return <>{text}</>;
  const parts = text.split(MARK);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="hl">
            {part}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}

export function plain(text: string): string {
  return text.replace(MARK, "$1");
}
