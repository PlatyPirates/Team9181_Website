"use client";
import { useActionState, useState } from "react";
import { createAccount, type CreateState } from "./actions";

const initial: CreateState = {};
const label = "mb-1 block font-mono text-[0.72rem] uppercase tracking-[0.14em] text-[color:var(--p-text-muted)]";
const input =
  "w-full rounded border border-[color:var(--p-border)] bg-[color:var(--p-input-bg)] px-3 py-2 text-[color:var(--p-text)] outline-none focus:border-[color:var(--p-accent-strong)]";
const cta =
  "sm:col-span-2 rounded border-2 border-[color:var(--p-cta-bg)] bg-[color:var(--p-cta-bg)] px-4 py-2.5 font-bold text-[color:var(--p-cta-text)] hover:bg-[color:var(--p-cta-hover-bg)] disabled:opacity-60";

const Label = ({ text, children }: { text: string; children: React.ReactNode }) => (
  <label className="block"><span className={label}>{text}</span>{children}</label>
);

export default function CreateAccountForm() {
  const [state, action, pending] = useActionState(createAccount, initial);
  const [role, setRole] = useState("student");
  return (
    <form action={action} className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
      <Label text="Full name"><input name="full_name" required className={input} /></Label>
      <Label text="Username"><input name="username" required minLength={3} maxLength={32} pattern="[a-zA-Z0-9._-]{3,32}" className={input} /></Label>
      <Label text="Email"><input name="email" type="email" required className={input} /></Label>
      <Label text="Temp password"><input name="password" required minLength={8} className={input} /></Label>
      <Label text="Role">
        <select name="role" value={role} onChange={(e) => setRole(e.target.value)} className={input}>
          <option value="student">Student</option>
          <option value="mentor">Mentor</option>
          <option value="lead">Lead</option>
        </select>
      </Label>
      <Label text="Lead title (Leads only)">
        <select name="lead_title" disabled={role !== "lead"} className={input}>
          <option value="">—</option>
          <option value="coach">Coach</option>
          <option value="team_admin">Team Admin</option>
        </select>
      </Label>
      <Label text="Student title (Students only)">
        <select name="student_title" disabled={role !== "student"} className={input}>
          <option value="">— (none, regular student) —</option>
          <option value="team_captain">Team Captain</option>
          <option value="subteam_lead">Sub-Team Lead</option>
        </select>
      </Label>
      {state.error ? (
        <p className="sm:col-span-2 rounded border border-[color:var(--p-error-border)] bg-[color:var(--p-error-bg)] px-3 py-2 text-sm text-[color:var(--p-error-text)]">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="sm:col-span-2 rounded border border-[color:var(--p-hint-border)] bg-[color:var(--p-hint-bg)] px-3 py-2 text-sm text-[color:var(--p-text)]">
          {state.ok}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className={cta}>{pending ? "Creating…" : "Create account"}</button>
    </form>
  );
}
