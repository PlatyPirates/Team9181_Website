"use client";
import { useState } from "react";
import { useKeptActionState } from "@/lib/use-kept-action-state";
import { saveSection, type SaveState } from "@/app/portal/profile/actions";
import { MONTHS, formatValue, selectOptions, type Field, type SectionKey } from "@/lib/profile";
import { btnCta, btnGhost, btnSmall, card, errorBox, inputCls, labelCls, muted } from "./styles";

export interface CardField extends Field {
  editable: boolean;
}

interface Props {
  subjectId: string;
  sectionKey: SectionKey;
  title: string;
  note?: string | null;
  tag?: string | null;
  fields: CardField[];
  values: Record<string, unknown>;
  names: Record<string, string>;
  missing?: string[];
}

export default function SectionCard({ subjectId, sectionKey, title, note, tag, fields, values, names, missing }: Props) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useKeptActionState<SaveState, FormData>(saveSection.bind(null, subjectId, sectionKey), {});
  const canEdit = fields.some((f) => f.editable);

  // Close the form after a successful save (adjusting state during render).
  const [seenSave, setSeenSave] = useState(state.savedAt);
  if (state.savedAt !== seenSave) {
    setSeenSave(state.savedAt);
    if (state.ok) setEditing(false);
  }

  return (
    <section id={sectionKey} className={`${card} scroll-mt-24 p-5`}>
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-extrabold text-[color:var(--p-text)]">{title}</h2>
          {note ? (
            <p className={`mt-0.5 flex items-start gap-1 text-xs ${muted}`}>
              <LockIcon /> {note}
            </p>
          ) : null}
          {tag ? (
            <p className="mt-1.5 inline-block rounded-full bg-[color:var(--p-hint-bg)] px-2 py-0.5 text-[0.7rem] text-[color:var(--p-text-muted)]">{tag}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {canEdit && !editing ? (
            <button type="button" className={btnSmall} onClick={() => setEditing(true)}>
              Edit
            </button>
          ) : null}
        </div>
      </header>

      {!editing ? (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {fields.map((f) => {
            const shown = formatValue(f, values, names);
            const isMissing = missing?.includes(f.short ?? f.label);
            return (
              <div key={f.key} className={f.type === "textarea" || f.type === "consent" || f.type === "yesno" ? "sm:col-span-2" : ""}>
                <dt className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[color:var(--p-text-faint)]">{f.label}</dt>
                <dd className={`mt-0.5 whitespace-pre-line ${shown ? "text-[color:var(--p-text)]" : isMissing ? "text-[color:var(--p-error-text)]" : muted}`}>
                  {shown ?? (isMissing ? "Needed" : "—")}
                </dd>
              </div>
            );
          })}
        </dl>
      ) : (
        <form onSubmit={action} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <FieldInput key={f.key} f={f} values={values} />
            ))}
          </div>
          {state.error ? <p className={errorBox}>{state.error}</p> : null}
          <div className="flex gap-2">
            <button className={btnCta} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </button>
            <button type="button" className={btnGhost} onClick={() => setEditing(false)} disabled={pending}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function FieldInput({ f, values }: { f: CardField; values: Record<string, unknown> }) {
  const v = values[f.key];
  const wide = f.type === "textarea" || f.type === "multi" || f.type === "consent" || f.type === "yesno" || f.type === "birthday";
  const req = !!f.required?.length;
  const label = (
    <span className={labelCls}>
      {f.label}
      {req ? <span className="text-[color:var(--p-error-text)]"> *</span> : null}
    </span>
  );
  const hint = f.hint ? <span className={`mt-1 block text-xs ${muted}`}>{f.hint}</span> : null;
  const wrap = (children: React.ReactNode) => (
    <div className={wide ? "sm:col-span-2" : ""}>
      {children}
    </div>
  );

  if (!f.editable) {
    return wrap(
      <div>
        {label}
        <p className={`text-sm ${muted}`}>{formatValue(f, values, {}) ?? "—"} <span className="text-xs">(set by a Lead)</span></p>
      </div>,
    );
  }

  switch (f.type) {
    case "textarea":
      return wrap(
        <label className="block">
          {label}
          <textarea name={f.key} defaultValue={(v as string) ?? ""} rows={3} maxLength={f.max} className={inputCls} />
          {hint}
        </label>,
      );
    case "select": {
      const options = selectOptions(f);
      return wrap(
        <label className="block">
          {label}
          <select name={f.key} defaultValue={v === null || v === undefined ? "" : String(v)} className={inputCls}>
            <option value="">{f.placeholder ?? "—"}</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {hint}
        </label>,
      );
    }
    case "multi": {
      const on = new Set(Array.isArray(v) ? (v as string[]) : []);
      return wrap(
        <fieldset>
          <legend className={labelCls}>{f.label}</legend>
          <div className="flex flex-wrap gap-2">
            {(f.options ?? []).map((o) => (
              <label
                key={o.value}
                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-[color:var(--p-border)] px-3 py-1 text-sm has-[:checked]:border-[color:var(--p-accent)] has-[:checked]:bg-[color:var(--p-hint-bg)]"
              >
                <input type="checkbox" name={f.key} value={o.value} defaultChecked={on.has(o.value)} />
                {o.label}
              </label>
            ))}
          </div>
          {hint}
        </fieldset>,
      );
    }
    case "checkbox":
      return wrap(
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name={f.key} defaultChecked={!!v} />
          {f.label}
        </label>,
      );
    case "consent":
      return wrap(
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name={f.key} defaultChecked={typeof v === "string"} className="mt-1" />
          <span>
            {f.label}
            {req ? <span className="text-[color:var(--p-error-text)]"> *</span> : null}
          </span>
        </label>,
      );
    case "yesno":
      return wrap(
        <fieldset>
          <legend className="text-sm">
            {f.label}
            {req ? <span className="text-[color:var(--p-error-text)]"> *</span> : null}
          </legend>
          <div className="mt-1 flex gap-4 text-sm">
            {[
              ["yes", "Yes"],
              ["no", "No"],
            ].map(([val, text]) => (
              <label key={val} className="flex items-center gap-1.5">
                <input type="radio" name={f.key} value={val} defaultChecked={(v === true && val === "yes") || (v === false && val === "no")} />
                {text}
              </label>
            ))}
          </div>
        </fieldset>,
      );
    case "birthday": {
      const b = v as { month: number; day: number; is_public: boolean } | null;
      return wrap(
        <fieldset>
          <legend className={labelCls}>{f.label}</legend>
          <div className="flex flex-wrap items-center gap-2">
            <select name="birthday_month" defaultValue={b ? String(b.month) : ""} className={`${inputCls} max-w-[11rem]`} aria-label="Birthday month">
              <option value="">Month</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select name="birthday_day" defaultValue={b ? String(b.day) : ""} className={`${inputCls} max-w-[6rem]`} aria-label="Birthday day">
              <option value="">Day</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="birthday_public" defaultChecked={!!b?.is_public} />
              Show to the whole team
            </label>
          </div>
          {hint}
        </fieldset>,
      );
    }
    default:
      return wrap(
        <label className="block">
          {label}
          <input
            name={f.key}
            type={f.type === "number" ? "number" : f.type}
            defaultValue={v === null || v === undefined ? "" : String(v)}
            maxLength={f.max}
            className={inputCls}
          />
          {hint}
        </label>,
      );
  }
}

export function LockIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" className="mt-0.5 inline-block shrink-0">
      <path
        d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2h.5A1 1 0 0 1 13 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h.5Zm1.5 0h4V5a2 2 0 0 0-4 0v2Z"
        fill="currentColor"
      />
    </svg>
  );
}
