"use client";
import { useActionState } from "react";
import { forgotAction, type ForgotState } from "./actions";

const initial: ForgotState = {};
const input =
  "w-full rounded border border-[color:var(--p-border)] bg-[color:var(--p-input-bg)] px-3 py-2 text-[color:var(--p-text)] outline-none focus:border-[color:var(--p-accent-strong)]";
const cta =
  "w-full rounded border-2 border-[color:var(--p-cta-bg)] bg-[color:var(--p-cta-bg)] px-4 py-2.5 font-bold text-[color:var(--p-cta-text)] hover:bg-[color:var(--p-cta-hover-bg)] disabled:opacity-60";

export default function ForgotForm() {
  const [state, action, pending] = useActionState(forgotAction, initial);
  if (state.ok) {
    return (
      <p className="rounded border border-[color:var(--p-hint-border)] bg-[color:var(--p-hint-bg)] px-3 py-3 text-[color:var(--p-text)]">
        If that account exists, we sent a reset link. Check your email.
      </p>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="mb-1 block font-mono text-[0.72rem] uppercase tracking-[0.14em] text-[color:var(--p-text-muted)]">
          Username or email
        </span>
        <input name="identifier" required className={input} />
      </label>
      {state.error ? (
        <p className="rounded border border-[color:var(--p-error-border)] bg-[color:var(--p-error-bg)] px-3 py-2 text-sm text-[color:var(--p-error-text)]">
          {state.error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className={cta}>{pending ? "Sending…" : "Email me a link"}</button>
    </form>
  );
}
