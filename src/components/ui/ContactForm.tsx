"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Send, Check, Copy } from "lucide-react";
import { contact } from "@/lib/content";
import { cn } from "@/lib/utils";

type Status = "idle" | "sending" | "sent" | "error";
type Errors = Partial<Record<"name" | "email" | "message", string>>;

/* No `outline-none`. It cancelled the global focus ring set on the bare
   `:focus-visible` in globals.css, which means these were the only controls on
   the site a keyboard user could not see. The ramp underline below is the
   field's *own* focus affordance; the ring is the one everything shares, and
   both are wanted. `focus-visible:` rather than `focus:` so a mouse click on a
   field doesn't paint either. */
const FIELD =
  "w-full border-0 border-b border-line bg-transparent px-0 py-3 font-sans text-base text-fg transition-colors placeholder:text-faint focus-visible:border-signal " +
  "focus-visible:[background-image:var(--gradient-spectrum)] focus-visible:[background-size:100%_2px] " +
  "focus-visible:[background-repeat:no-repeat] focus-visible:[background-position:0_100%]";

/* Long enough that a mail client which is merely slow to come up still counts
   as a success, short enough that a browser which silently swallowed the
   mailto: doesn't leave the form sitting in "Sending". */
const HANDOFF_TIMEOUT = 2000;

/**
 * Accessible contact form: visible labels, inline validation on submit, focus
 * moved to the first invalid field, aria-live status. With no backend it
 * validates then opens the user's mail client and shows a success state.
 *
 * Underlined fields rather than boxes — on the closing block the form sits
 * beside a 10vw headline, and four bordered rectangles there would compete with
 * it instead of sitting under it.
 *
 * The `mailto:` handoff is *watched*, not assumed. On a managed browser, or one
 * with no mail handler registered, navigating to a `mailto:` does nothing at
 * all and reports nothing — the old version declared success 900ms later
 * regardless, which is the difference between a form that works and a form that
 * appears to. If the document never loses focus we fall to `error` and hand
 * over the address itself.
 */
export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Errors>({});
  const [copied, setCopied] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const timers = useRef<number[]>([]);

  const after = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  useEffect(
    () => () => {
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
    },
    []
  );

  const validate = (data: FormData): Errors => {
    const next: Errors = {};
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const message = String(data.get("message") || "").trim();
    if (!name) next.name = "Callsign required.";
    if (!email) next.email = "Address required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = "Address format invalid.";
    if (message.length < 10) next.message = "Message too short (min 10 chars).";
    return next;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const found = validate(data);
    setErrors(found);

    if (Object.keys(found).length > 0) {
      const first = form.querySelector<HTMLElement>(
        `[name="${Object.keys(found)[0]}"]`
      );
      first?.focus({ preventScroll: true });
      return;
    }

    setStatus("sending");

    const name = String(data.get("name"));
    const email = String(data.get("email"));
    const subject = encodeURIComponent(`Transmission from ${name}`);
    /* The address was validated and then thrown away, so every message arrived
       with no way to reply to it. It goes in the body rather than a `reply-to=`
       parameter: mail clients ignore that field on a mailto: URL, and the
       sender's own From: is whichever account they happen to be composing in. */
    const body = encodeURIComponent(
      `${String(data.get("message"))}\n\n— ${name}\n${email}`
    );

    after(900, () => {
      let handed = false;
      const onAway = () => {
        if (handed) return;
        handed = true;
        setStatus("sent");
      };
      window.addEventListener("blur", onAway, { once: true });
      document.addEventListener("visibilitychange", onAway, { once: true });

      window.location.href = `mailto:${contact.email}?subject=${subject}&body=${body}`;

      after(HANDOFF_TIMEOUT, () => {
        window.removeEventListener("blur", onAway);
        document.removeEventListener("visibilitychange", onAway);
        if (handed) return;
        setStatus(document.hasFocus() ? "error" : "sent");
      });
    });
  };

  const reset = () => {
    formRef.current?.reset();
    setStatus("idle");
    setErrors({});
    setCopied(false);
    formRef.current?.querySelector<HTMLElement>("#name")?.focus({
      preventScroll: true,
    });
  };

  const errorCount = Object.keys(errors).length;

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-5"
    >
      <Field label="CALLSIGN / NAME" name="name" error={errors.name}>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Your name"
          className={cn(FIELD, errors.name && "border-hazard")}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "name-error" : undefined}
        />
      </Field>

      <Field label="RETURN ADDRESS / EMAIL" name="email" error={errors.email}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@domain.com"
          className={cn(FIELD, errors.email && "border-hazard")}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
        />
      </Field>

      <Field label="MESSAGE / PAYLOAD" name="message" error={errors.message}>
        <textarea
          id="message"
          name="message"
          rows={4}
          placeholder="The role, the team, or anything you'd like to ask…"
          className={cn(FIELD, "resize-none", errors.message && "border-hazard")}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "message-error" : undefined}
        />
      </Field>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <button
          type="submit"
          /* Only `sending` disables. The old condition was `!== "idle"`, and
             since nothing ever left `sent`, one submit killed the form for the
             rest of the session. */
          disabled={status === "sending"}
          style={{ backgroundImage: "var(--gradient-spectrum)" }}
          className={cn(
            "group relative flex w-fit items-center justify-center gap-3 px-7 py-3.5 font-mono text-[0.6875rem] uppercase tracking-[0.2em] transition-transform duration-300",
            // The ramp carries the colour and the label stays dark against it.
            // Bone on magenta is only ~3:1 — the fill has to be the bright side.
            "chamfer-sm text-void hover:scale-[1.03] disabled:opacity-70"
          )}
        >
          {status === "idle" && (
            <>
              Send message <Send size={14} />
            </>
          )}
          {status === "sending" && (
            <>
              Sending <Loader2 size={14} className="animate-spin" />
            </>
          )}
          {status === "sent" && (
            <>
              Message sent <Check size={14} />
            </>
          )}
          {status === "error" && (
            <>
              Try again <Send size={14} />
            </>
          )}
        </button>

        {(status === "sent" || status === "error") && (
          <button
            type="button"
            onClick={reset}
            className="micro underline-offset-4 transition-colors hover:text-fg hover:underline"
          >
            Send another
          </button>
        )}
      </div>

      {status === "error" && (
        <div className="flex flex-wrap items-center gap-3 border-l-2 border-hazard pl-4">
          <p className="text-sm text-muted">
            No mail client answered. Write to
          </p>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(contact.email);
              setCopied(true);
            }}
            className="flex items-center gap-2 font-mono text-sm text-fg underline-offset-4 hover:underline"
          >
            {contact.email}
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span className="sr-only">
              {copied ? "Address copied" : "Copy address"}
            </span>
          </button>
        </div>
      )}

      {/* The single live region for the whole form. The per-field messages used
          to carry `role="alert"` each, which announced every one of them twice
          — once as an alert and again through `aria-describedby` when focus
          landed on the field. */}
      <p aria-live="polite" className="sr-only">
        {status === "sent"
          ? "Your mail client has been opened."
          : status === "error"
            ? `No mail client answered. Write to ${contact.email} instead.`
            : errorCount > 0
              ? `${errorCount} ${errorCount === 1 ? "field needs" : "fields need"} attention.`
              : ""}
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  error,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      {/* Label and error are siblings, not nested. Inside the `<label>` the
          error text joined the field's accessible name, so a screen reader read
          "callsign / name callsign required" as the name of the input — and
          then read the error a second time from `aria-describedby`. The flex
          row reproduces the previous layout exactly. */}
      <div className="micro flex items-center justify-between gap-4">
        <label htmlFor={name}>{label}</label>
        {error && (
          <span id={`${name}-error`} className="micro !text-hazard">
            {error}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
