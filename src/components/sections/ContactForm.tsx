"use client";

import { useState } from "react";
import { Loader2, Send, Check } from "lucide-react";
import { contact } from "@/lib/content";
import { cn } from "@/lib/utils";

type Status = "idle" | "sending" | "sent";
type Errors = Partial<Record<"name" | "email" | "message", string>>;

const FIELD =
  "w-full border border-line bg-surface-2 px-4 py-3 font-mono text-sm text-fg outline-none transition-colors placeholder:text-faint focus:border-cyan";

/**
 * Accessible "uplink" contact form: visible labels, inline validation on
 * submit, focus moved to the first invalid field, aria-live status. With no
 * backend it validates then opens the user's mail client and shows a success
 * state.
 */
export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Errors>({});

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
      first?.focus();
      return;
    }

    setStatus("sending");
    const subject = encodeURIComponent(`Transmission from ${data.get("name")}`);
    const body = encodeURIComponent(String(data.get("message")));
    setTimeout(() => {
      setStatus("sent");
      window.location.href = `mailto:${contact.email}?subject=${subject}&body=${body}`;
    }, 900);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <Field label="CALLSIGN / NAME" name="name" error={errors.name}>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Your name"
          className={cn(FIELD, errors.name && "border-red")}
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
          className={cn(FIELD, errors.email && "border-red")}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
        />
      </Field>

      <Field label="MESSAGE / PAYLOAD" name="message" error={errors.message}>
        <textarea
          id="message"
          name="message"
          rows={4}
          placeholder="Describe the system you want to build…"
          className={cn(FIELD, "resize-none", errors.message && "border-red")}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "message-error" : undefined}
        />
      </Field>

      <button
        type="submit"
        disabled={status !== "idle"}
        className={cn(
          "group relative mt-2 flex items-center justify-center gap-3 chamfer-sm px-6 py-4 font-mono text-xs uppercase tracking-[0.22em] transition-colors",
          status === "sent"
            ? "bg-cyan text-bg"
            : "bg-cyan text-bg hover:bg-cyan/90 disabled:opacity-70"
        )}
      >
        {status === "idle" && (
          <>
            [ Transmit Message ] <Send size={14} />
          </>
        )}
        {status === "sending" && (
          <>
            Establishing uplink <Loader2 size={14} className="animate-spin" />
          </>
        )}
        {status === "sent" && (
          <>
            Transmission sent <Check size={14} />
          </>
        )}
      </button>

      <p aria-live="polite" className="sr-only">
        {status === "sent" ? "Your message client has been opened." : ""}
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
      <label
        htmlFor={name}
        className="hud-label flex items-center justify-between"
      >
        <span>{label}</span>
        {error && (
          <span id={`${name}-error`} className="text-red" role="alert">
            {error}
          </span>
        )}
      </label>
      {children}
    </div>
  );
}
