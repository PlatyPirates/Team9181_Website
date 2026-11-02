"use client";
import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

const initial: LoginState = {};
const label = "mb-1 block font-mono text-[0.72rem] uppercase tracking-[0.14em] text-[color:var(--p-text-muted)]";
const input =
  "w-full rounded border border-[color:var(--p-border)] bg-[color:var(--p-input-bg)] px-3 py-2 text-[color:var(--p-text)] outline-none focus:border-[color:var(--p-accent-strong)]";
const cta =
  "w-full rounded border-2 border-[color:var(--p-cta-bg)] bg-[color:var(--p-cta-bg)] px-4 py-2.5 font-bold text-[color:var(--p-cta-text)] hover:bg-[color:var(--p-cta-hover-bg)] disabled:opacity-60";
const err =
  "rounded border border-[color:var(--p-error-border)] bg-[color:var(--p-error-bg)] px-3 py-2 text-sm text-[color:var(--p-error-text)]";

export default function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(loginAction, initial);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className={label}>Username or email</span>
        <input name="identifier" type="text" autoComplete="username" required className={input} />
      </label>
      <label className="block">
        <span className={label}>Password</span>
        <input name="password" type="password" autoComplete="current-password" required minLength={8} className={input} />
      </label>
      {state.error ? <p className={err}>{state.error}</p> : null}
      <button type="submit" disabled={pending} className={cta}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
