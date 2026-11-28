"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useKeptActionState } from "@/lib/use-kept-action-state";
import { buttonClass } from "@/components/ui";
import { submitJoinForm, type JoinFormState } from "@/app/(site)/join/actions";
import type { Kind } from "@/lib/recruiting";
import { OTHER, isShown, type FormField, type FormSpec } from "@/lib/recruiting-forms";

const EMAIL_PATTERN = "[^\\s@]+@[^\\s@]+\\.[^\\s@]+";
const field = "mb-[22px] flex flex-col gap-1.5";
const label = "text-[0.92rem] font-bold";
const helpCls = "text-[0.85rem] text-charcoal/70";
const input = "rounded border-[1.5px] border-fog bg-cream px-3 py-2.5 font-body text-base leading-normal text-charcoal";
const choice = "flex cursor-pointer items-start gap-2.5 rounded px-1 py-1 text-[0.95rem] leading-snug hover:bg-gold/10";
const box = "mt-[3px] size-4 shrink-0 accent-burgundy";

function Required() {
  return <span className="text-burgundy"> *</span>;
}

/** Red message under a question that needs fixing. */
function FieldError({ id, msg }: { id: string; msg?: string }) {
  if (!msg) return null;
  return (
    <p id={id} role="alert" className="m-0 flex items-start gap-1.5 text-[0.88rem] font-semibold text-red-700 dark:text-red-300">
      <span aria-hidden>⚠</span>
      {msg}
    </p>
  );
}

const errRing = "border-red-500! ring-2 ring-red-500/40";

/** Plain-language reason a field failed the browser's checks. */
function messageFor(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, f: FormField | undefined): string {
  const v = el.validity;
  if (el.name.endsWith("__other")) return 'Please type your answer next to "Other".';
  if (v.valueMissing) {
    if (f?.type === "consent") return "Please tick this box to continue.";
    if (f?.type === "radio" || f?.type === "select") return "Please choose an answer.";
    return "This question is required.";
  }
  if (el.type === "email" && (v.typeMismatch || v.patternMismatch))
    return "Enter a full email address, like name@example.com (it needs an @ and a dot after it).";
  if (el.type === "tel") return "Enter a phone number, like 713-555-0123.";
  return el.validationMessage || "Please check this answer.";
}

/** Radio or checkbox list, with an optional "Other:" text box. */
function Choices({ f, multi, error, onClear }: { f: FormField; multi: boolean; error?: string; onClear?: () => void }) {
  const [otherOn, setOtherOn] = useState(false);
  const [picked, setPicked] = useState(false);
  const type = multi ? "checkbox" : "radio";
  return (
    <fieldset className={field} aria-invalid={!!error || undefined}>
      <legend className={`${label} mb-1.5`}>
        {f.label}
        {f.required && <Required />}
      </legend>
      {f.help && <p className={helpCls}>{f.help}</p>}
      <div className={`flex flex-col gap-0.5 ${error ? "rounded outline-2 outline-offset-4 outline-red-500" : ""}`}>
        {f.options?.map((o) => (
          <label key={o} className={choice}>
            <input
              type={type}
              name={f.name}
              value={o}
              className={box}
              // Radios can use the browser's own required check; checkbox groups are checked on submit.
              required={!multi && f.required}
              onChange={!multi ? () => (setOtherOn(false), setPicked(true)) : undefined}
            />
            <span>{o}</span>
          </label>
        ))}
        {f.other && (
          <label className={`${choice} items-center`}>
            <input
              type={type}
              name={f.name}
              value={OTHER}
              className={`${box} mt-0`}
              required={!multi && f.required}
              onChange={(e) => (setOtherOn(e.currentTarget.checked), setPicked(true))}
            />
            <span>Other:</span>
            <input
              type="text"
              name={`${f.name}__other`}
              aria-label={`${f.label}: other`}
              required={otherOn}
              onFocus={(e) => {
                // Typing in the box picks "Other".
                const radio = e.currentTarget.parentElement?.querySelector<HTMLInputElement>(`input[value="${OTHER}"]`);
                if (radio && !radio.checked) {
                  radio.checked = true;
                  setOtherOn(true);
                }
              }}
              className="min-w-0 flex-1 border-0 border-b-[1.5px] border-fog bg-transparent px-1 py-1 font-body text-base text-charcoal focus:border-burgundy focus:outline-none"
            />
          </label>
        )}
      </div>
      {/* Like Google Forms: an optional pick-one question can be un-answered. */}
      {!multi && !f.required && picked && (
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.closest("fieldset")?.querySelectorAll<HTMLInputElement>(`input[name="${f.name}"]`).forEach((r) => (r.checked = false));
            setOtherOn(false);
            setPicked(false);
            onClear?.();
          }}
          className="self-end cursor-pointer border-0 bg-transparent p-0 text-[0.85rem] text-charcoal/70 underline hover:text-burgundy"
        >
          Clear selection
        </button>
      )}
      <FieldError id={`f-${f.name}-err`} msg={error} />
    </fieldset>
  );
}

export default function NativeJoinForm({ kind, spec }: { kind: Kind; spec: FormSpec }) {
  const [state, action, pending] = useKeptActionState<JoinFormState, FormData>(submitJoinForm, {});
  // Question name -> what's wrong with it. Shown in red under each question.
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Answers to questions that other questions depend on (showIf).
  const controllers = new Set(spec.fields.flatMap((f) => (f.showIf ? [f.showIf.field] : [])));
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const jumpTo = (name: string) => {
    const wrap = document.getElementById(`q-${name}`);
    // "center" keeps it clear of the sticky site header.
    wrap?.scrollIntoView({ behavior: "smooth", block: "center" });
    wrap?.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea")?.focus({ preventScroll: true });
  };

  // The server double-checks everything; if it rejects an answer, show that under the question too.
  useEffect(() => {
    if (!state.error || !state.field) return;
    setErrors({ [state.field]: state.error });
    jumpTo(state.field);
  }, [state]);

  if (state.ok) {
    return (
      <p className="rounded bg-parchment-dark p-4 text-[1rem]" role="status">
        {spec.thanks}
      </p>
    );
  }

  const byName = new Map(spec.fields.map((f) => [f.name, f]));

  // Check every answer before sending and list each problem under its question.
  // (The browser's own pop-ups are skipped: they show one at a time, vanish quickly
  // and can hide behind the sticky header.) Nothing typed is ever cleared.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    const form = e.currentTarget;
    const fd = new FormData(form);
    const found: Record<string, string> = {};
    for (const el of Array.from(form.elements)) {
      if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement)) continue;
      if (!el.name || el.validity.valid) continue;
      const name = el.name.replace(/__other$/, "");
      if (!found[name]) found[name] = messageFor(el, byName.get(name));
    }
    for (const f of spec.fields) {
      if (found[f.name] || !isShown(f, (n) => String(fd.get(n) ?? ""))) continue;
      if (f.type === "checkboxes" && f.required && fd.getAll(f.name).length === 0) found[f.name] = "Please pick at least one answer.";
    }
    setErrors(found);
    const first = spec.fields.find((f) => found[f.name]);
    if (first) {
      e.preventDefault();
      jumpTo(first.name);
      return;
    }
    action(e);
  };

  // Fixing a question clears its message.
  const clearError = (name: string) =>
    setErrors((cur) => {
      const key = name.replace(/__other$/, "");
      if (!cur[key]) return cur;
      const next = { ...cur };
      delete next[key];
      return next;
    });

  const errorCount = Object.keys(errors).length;

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      onChange={(e) => {
        const t = e.target as unknown as HTMLInputElement;
        if (controllers.has(t.name)) setAnswers((a) => ({ ...a, [t.name]: t.value }));
        clearError(t.name);
      }}
    >
      <input type="hidden" name="kind" value={kind} />
      {/* Honeypot for bots; hidden from people and screen readers. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <p className="mb-5 text-[0.85rem] text-charcoal/70">
        <span className="text-burgundy">*</span> Indicates required question
      </p>

      {spec.fields.map((f) => {
        if (!isShown(f, (n) => answers[n] ?? null)) return null;
        const id = `f-${f.name}`;
        if (f.type === "radio" || f.type === "checkboxes") {
          return (
            <div key={f.name} id={`q-${f.name}`}>
              <Choices
                f={f}
                multi={f.type === "checkboxes"}
                error={errors[f.name]}
                onClear={() => setAnswers((a) => ({ ...a, [f.name]: "" }))}
              />
            </div>
          );
        }
        if (f.type === "consent") {
          return (
            <fieldset key={f.name} id={`q-${f.name}`} className={field}>
              <legend className={`${label} mb-1.5`}>
                {f.label}
                {f.required && <Required />}
              </legend>
              <label className={`${choice} ${errors[f.name] ? "rounded outline-2 outline-offset-2 outline-red-500" : ""}`}>
                <input type="checkbox" id={id} name={f.name} required={f.required} className={box} aria-invalid={!!errors[f.name] || undefined} />
                <span>{f.consentText}</span>
              </label>
              <FieldError id={`${id}-err`} msg={errors[f.name]} />
            </fieldset>
          );
        }
        return (
          <div key={f.name} id={`q-${f.name}`} className={field}>
            <label className={label} htmlFor={id}>
              {f.label}
              {f.required && <Required />}
            </label>
            {f.help && <p className={helpCls}>{f.help}</p>}
            {f.type === "textarea" ? (
              <textarea className={`${input} min-h-[120px] resize-y ${errors[f.name] ? errRing : ""}`} id={id} name={f.name} required={f.required} placeholder={f.placeholder} />
            ) : f.type === "select" ? (
              <select className={`${input} ${errors[f.name] ? errRing : ""}`} id={id} name={f.name} required={f.required} defaultValue="">
                <option value="" disabled>
                  Choose one…
                </option>
                {f.options?.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                className={`${input} ${errors[f.name] ? errRing : ""}`}
                aria-invalid={!!errors[f.name] || undefined}
                aria-describedby={errors[f.name] ? `${id}-err` : undefined}
                type={f.type}
                id={id}
                name={f.name}
                required={f.required}
                placeholder={f.placeholder}
                // Same rule as the server, so the browser flags it before sending (e.g. "name@school" with no ".org").
                pattern={f.type === "email" ? EMAIL_PATTERN : undefined}
                title={f.type === "email" ? "Enter an email address like name@example.com" : undefined}
              />
            )}
            <FieldError id={`${id}-err`} msg={errors[f.name]} />
          </div>
        );
      })}

      {errorCount > 0 && (
        <p className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-[0.9rem] text-red-900 dark:border-red-400/40 dark:bg-red-950/40 dark:text-red-200" role="alert">
          {errorCount === 1 ? "1 question needs" : `${errorCount} questions need`} fixing. Look for the red messages above.{" "}
          <button
            type="button"
            onClick={() => {
              const first = spec.fields.find((f) => errors[f.name]);
              if (first) jumpTo(first.name);
            }}
            className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-inherit underline"
          >
            Take me there
          </button>
        </p>
      )}
      {state.error && !state.field && (
        <p className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-[0.9rem] text-red-900 dark:border-red-400/40 dark:bg-red-950/40 dark:text-red-200" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className={buttonClass("primary")} disabled={pending}>
        {pending ? "Sending…" : spec.submitLabel}
      </button>
    </form>
  );
}
