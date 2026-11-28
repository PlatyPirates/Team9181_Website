"use client";
import { useEffect, useRef } from "react";
import { useKeptActionState } from "@/lib/use-kept-action-state";
import { createGrant, type GrantState } from "./profile-actions";
import { GRANT_SCOPES, SUBTEAMS } from "@/lib/profile";

const selectCls =
  "rounded border border-[color:var(--p-border)] bg-[color:var(--p-input-bg)] px-2 py-1.5 text-[color:var(--p-text)]";
const pill =
  "flex cursor-pointer items-center gap-1.5 rounded-full border border-[color:var(--p-border)] px-3 py-1 text-sm has-[:checked]:border-[color:var(--p-accent)] has-[:checked]:bg-[color:var(--p-hint-bg)]";
const label = "mb-1 block font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--p-accent)]";

export default function GrantForm({ people }: { people: { id: string; label: string }[] }) {
  const [state, action, pending] = useKeptActionState<GrantState, FormData>(createGrant, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} onSubmit={action} className="portal-surface space-y-4 rounded border border-[color:var(--p-border)] bg-[color:var(--p-surface)] p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <span className={label}>Who</span>
          <select name="grantee" required defaultValue="" className={`${selectCls} w-full`}>
            <option value="" disabled>Pick a mentor, Team Captain or Sub-Team Lead…</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={label}>Until (optional)</span>
          <input type="date" name="expires_on" className={`${selectCls} w-full`} />
        </label>
      </div>
      <fieldset>
        <legend className={label}>Access to</legend>
        <div className="flex flex-wrap gap-2">
          {GRANT_SCOPES.map((g) => (
            <label key={g.key} className={pill} title={g.unlocks}>
              <input type="checkbox" name="scope" value={g.key} />
              {g.label}
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-[color:var(--p-text-muted)]">
          {GRANT_SCOPES.map((g) => `${g.label}: ${g.unlocks.toLowerCase()}`).join(". ")}. Read-only.
        </p>
      </fieldset>
      <fieldset>
        <legend className={label}>For which members</legend>
        <div className="flex flex-wrap gap-2">
          {SUBTEAMS.map((t) => (
            <label key={t} className={pill}>
              <input type="checkbox" name="subteams" value={t} />
              {t}
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-[color:var(--p-text-muted)]">Leave all unticked for the whole team. Parents count as part of their students&apos; subteams.</p>
      </fieldset>
      {state.error ? (
        <p className="rounded border border-[color:var(--p-error-border)] bg-[color:var(--p-error-bg)] px-3 py-2 text-sm text-[color:var(--p-error-text)]">{state.error}</p>
      ) : null}
      {state.ok ? <p className="text-sm text-[color:var(--p-text-muted)]">{state.ok}</p> : null}
      <button
        disabled={pending}
        className="rounded border-2 border-[color:var(--p-cta-bg)] bg-[color:var(--p-cta-bg)] px-4 py-2 font-bold text-[color:var(--p-cta-text)] hover:bg-[color:var(--p-cta-hover-bg)] disabled:opacity-60"
      >
        {pending ? "Saving…" : "Give access"}
      </button>
    </form>
  );
}
