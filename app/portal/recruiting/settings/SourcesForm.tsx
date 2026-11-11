"use client";

import { useActionState, useState } from "react";
import { saveSources, type SettingsState } from "../actions";
import { KIND_LABEL, KINDS, type Kind, type RecruitingSource } from "@/lib/recruiting";

const inputCls =
  "w-full rounded border border-[color:var(--p-border)] bg-[color:var(--p-input-bg)] px-3 py-2 text-sm text-[color:var(--p-text)]";
const btnCta =
  "rounded border-2 border-[color:var(--p-cta-bg)] bg-[color:var(--p-cta-bg)] px-4 py-2 font-bold text-[color:var(--p-cta-text)] hover:bg-[color:var(--p-cta-hover-bg)] disabled:opacity-60";

export default function SourcesForm({ sources }: { sources: Record<Kind, RecruitingSource> }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSources, {});
  const [modes, setModes] = useState<Record<Kind, string>>({
    student: sources.student.mode,
    mentor: sources.mentor.mode,
    sponsor: sources.sponsor.mode,
  });

  return (
    <form action={action} className="space-y-4">
      {KINDS.map((k) => (
        <fieldset key={k} className="portal-surface rounded-xl border border-[color:var(--p-border)] bg-[color:var(--p-surface)] p-5">
          <legend className="sr-only">{KIND_LABEL[k]}</legend>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-xl font-extrabold text-[color:var(--p-text)]">{KIND_LABEL[k]}</h3>
            <div role="radiogroup" className="flex overflow-hidden rounded border border-[color:var(--p-border-strong)] text-sm">
              {(["native", "google"] as const).map((m) => (
                <label
                  key={m}
                  className={`cursor-pointer px-3 py-1.5 ${
                    modes[k] === m ? "bg-[color:var(--p-cta-bg)] font-bold text-[color:var(--p-cta-text)]" : "text-[color:var(--p-accent)]"
                  }`}
                >
                  <input
                    type="radio"
                    name={`${k}_mode`}
                    value={m}
                    checked={modes[k] === m}
                    onChange={() => setModes((s) => ({ ...s, [k]: m }))}
                    className="sr-only"
                  />
                  {m === "native" ? "Website form" : "Google Form"}
                </label>
              ))}
            </div>
          </div>
          <p className="mt-2 text-sm text-[color:var(--p-text-muted)]">
            {modes[k] === "native" ? (
              <>The Join Us tile opens <a className="underline" href={`/join/${k}`} target="_blank" rel="noopener">/join/{k}</a>. Submissions land here automatically.</>
            ) : (
              <>The Join Us tile opens your Google Form. Add the script below to its response Sheet so submissions land here too.</>
            )}
          </p>
          <div className={`mt-3 grid gap-3 md:grid-cols-2 ${modes[k] === "google" ? "" : "opacity-70"}`}>
            <label className="text-sm text-[color:var(--p-text)]">
              Google Form link (the one people fill out)
              <input name={`${k}_form`} defaultValue={sources[k].google_form_url ?? ""} placeholder="https://forms.gle/…" className={`${inputCls} mt-1`} />
            </label>
            <label className="text-sm text-[color:var(--p-text)]">
              Response Sheet link (optional, for a quick button)
              <input name={`${k}_sheet`} defaultValue={sources[k].google_sheet_url ?? ""} placeholder="https://docs.google.com/spreadsheets/…" className={`${inputCls} mt-1`} />
            </label>
          </div>
        </fieldset>
      ))}
      {state.error && <p className="text-sm text-[color:var(--p-error-text)]" role="alert">{state.error}</p>}
      {state.ok && <p className="text-sm text-[color:var(--p-text)]" role="status">{state.ok}</p>}
      <button className={btnCta} disabled={pending}>{pending ? "Saving…" : "Save"}</button>
    </form>
  );
}
