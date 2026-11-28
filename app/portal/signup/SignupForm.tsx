"use client";
import { useState } from "react";
import { useKeptActionState } from "@/lib/use-kept-action-state";
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
  const [state, action, pending] = useKeptActionState(signupAction, initial);
  const [joiningAs, setJoiningAs] = useState("student");
  return (
    <form onSubmit={action} className="space-y-4">
      <fieldset>
        <legend className={label}>I&apos;m joining as</legend>
        <div className="flex flex-wrap gap-2">
          {[
            ["student", "Student"],
            ["mentor", "Mentor or volunteer"],
            ["parent", "Parent or guardian"],
          ].map(([value, text]) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-[color:var(--p-border)] px-3 py-1 text-sm text-[color:var(--p-text)] has-[:checked]:border-[color:var(--p-accent)] has-[:checked]:bg-[color:var(--p-hint-bg)]"
            >
              <input type="radio" name="joining_as" value={value} checked={joiningAs === value} onChange={() => setJoiningAs(value)} />
              {text}
            </label>
          ))}
        </div>
      </fieldset>
      <Label text="Full name"><input name="full_name" required className={input} /></Label>
      {joiningAs === "parent" ? (
        <Label text="Your student's full name (one per line)">
          <textarea name="student_names" required rows={2} maxLength={500} className={input} />
          <span className="mt-1 block text-xs text-[color:var(--p-text-muted)]">
            A Lead will link your account to each student. Mentors who are also parents can sign up as mentors and ask for the link later from their Profile.
          </span>
        </Label>
      ) : null}
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
