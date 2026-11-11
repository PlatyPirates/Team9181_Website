"use client";

import { useActionState } from "react";
import { buttonClass } from "@/components/ui";
import { submitJoinForm, type JoinFormState } from "@/app/(site)/join/actions";
import type { Kind } from "@/lib/recruiting";
import type { FormSpec } from "@/lib/recruiting-forms";

const field = "mb-[18px] flex flex-col gap-1.5";
const label = "text-[0.92rem] font-bold";
const input = "rounded border-[1.5px] border-fog bg-cream px-3 py-2.5 font-body text-base leading-normal text-charcoal";

export default function NativeJoinForm({ kind, spec }: { kind: Kind; spec: FormSpec }) {
  const [state, action, pending] = useActionState<JoinFormState, FormData>(submitJoinForm, {});

  if (state.ok) {
    return (
      <p className="rounded bg-parchment-dark p-4 text-[1rem]" role="status">
        {spec.thanks}
      </p>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="kind" value={kind} />
      {/* Honeypot for bots; hidden from people and screen readers. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {spec.fields.map((f) => {
        const id = `f-${f.name}`;
        return (
          <div key={f.name} className={field}>
            <label className={label} htmlFor={id}>
              {f.label}
              {f.required && <span className="text-burgundy"> *</span>}
            </label>
            {f.type === "textarea" ? (
              <textarea className={`${input} min-h-[120px] resize-y`} id={id} name={f.name} required={f.required} placeholder={f.placeholder} />
            ) : f.type === "select" ? (
              <select className={input} id={id} name={f.name} required={f.required} defaultValue="">
                <option value="" disabled>
                  Choose one…
                </option>
                {f.options?.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input className={input} type={f.type} id={id} name={f.name} required={f.required} placeholder={f.placeholder} />
            )}
          </div>
        );
      })}

      {state.error && (
        <p className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-[0.9rem] text-red-900" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className={buttonClass("primary")} disabled={pending}>
        {pending ? "Sending…" : spec.submitLabel}
      </button>
    </form>
  );
}
