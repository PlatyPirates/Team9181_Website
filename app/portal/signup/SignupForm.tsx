"use client";
import { useActionState } from "react";
import { signupAction, type SignupState } from "./actions";

const initial: SignupState = {};
const label = "mb-1 block font-mono text-[0.72rem] uppercase tracking-[0.14em] text-[color:var(--p-text-muted)]";
const input =
  "w-full rounded border border-[color:var(--p-border)] bg-[color:var(--p-input-bg)] px-3 py-2 text-[color:var(--p-text)] outline-none focus:border-[color:var(--p-accent-strong)]";
const cta =
  "w-full rounded border-2 border-[color:var(--p-cta-bg)] bg-[color:var(--p-cta-bg)] px-4 py-2.5 font-bold text-[color:var(--p-cta-text)] hover:bg-[color:var(--p-cta-hover-bg)] disabled:opacity-60";
const err =
  "rounded border border-[color:var(--p-error-border)] bg-[color:var(--p-error-bg)] px-3 py-2 text-sm text-[color:var(--p-error-text)]";

const Label = ({ text, children }: { text: string; children: React.ReactNode }) => (
  <label className="block"><span className={label}>{text}</span>{children}</label>
);

export default function SignupForm() {
  const [state, action, pending] = useActionState(signupAction, initial);
  return (
    <form action={action} className="space-y-4">
      <Label text="Full name"><input name="full_name" required className={input} /></Label>
      <Label text="Username">
        <input name="username" required minLength={3} maxLength={32} pattern="[a-zA-Z0-9._-]{3,32}" className={input} />
      </Label>
      <Label text="Email"><input name="email" type="email" required autoComplete="email" className={input} /></Label>
      <Label text="Password"><input name="password" type="password" required minLength={8} autoComplete="new-password" className={input} /></Label>
      {state.error ? <p className={err}>{state.error}</p> : null}
      <button type="submit" disabled={pending} className={cta}>{pending ? "Creating…" : "Create account"}</button>
    </form>
  );
}
