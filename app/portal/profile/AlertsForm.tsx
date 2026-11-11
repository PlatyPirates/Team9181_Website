"use client";

import { useActionState, useState } from "react";
import { savePrefs, type PrefsState } from "@/app/portal/recruiting/actions";
import { KIND_LABEL, KINDS } from "@/lib/recruiting";

export interface Prefs {
  email_alerts: boolean;
  ntfy_enabled: boolean;
  ntfy_topic: string | null;
  kinds: string[];
}

const inputCls =
  "rounded border border-[color:var(--p-border)] bg-[color:var(--p-input-bg)] px-3 py-2 font-mono text-sm text-[color:var(--p-text)]";
const btnCta =
  "rounded border-2 border-[color:var(--p-cta-bg)] bg-[color:var(--p-cta-bg)] px-4 py-2 font-bold text-[color:var(--p-cta-text)] hover:bg-[color:var(--p-cta-hover-bg)] disabled:opacity-60";
const btnGhost =
  "rounded border border-[color:var(--p-border-strong)] px-4 py-2 text-[color:var(--p-accent)] hover:bg-[color:var(--p-cta-bg)] hover:text-[color:var(--p-cta-text)] disabled:opacity-60";

export default function AlertsForm({ prefs, suggestedTopic }: { prefs: Prefs; suggestedTopic: string }) {
  const [state, action, pending] = useActionState<PrefsState, FormData>(savePrefs, {});
  const [push, setPush] = useState(prefs.ntfy_enabled);
  const [topic, setTopic] = useState(prefs.ntfy_topic ?? suggestedTopic);

  return (
    <form action={action} className="portal-surface max-w-2xl space-y-5 rounded-xl border border-[color:var(--p-border)] bg-[color:var(--p-surface)] p-6 text-[color:var(--p-text)]">
      <fieldset>
        <legend className="font-semibold">Alert me about</legend>
        <div className="mt-2 flex flex-wrap gap-4">
          {KINDS.map((k) => (
            <label key={k} className="flex items-center gap-2">
              <input type="checkbox" name={`kind_${k}`} defaultChecked={prefs.kinds.includes(k)} />
              {KIND_LABEL[k]}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-2">
        <input type="checkbox" name="email_alerts" defaultChecked={prefs.email_alerts} />
        Email me at my portal email address
      </label>

      <div>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="ntfy_enabled" checked={push} onChange={(e) => setPush(e.target.checked)} />
          Send a notification to my phone
        </label>
        {push && (
          <div className="mt-3 space-y-3 rounded border border-dashed border-[color:var(--p-border-strong)] p-4 text-sm">
            <ol className="list-decimal space-y-1 pl-5 text-[color:var(--p-text-muted)]">
              <li>Install the free <b>ntfy</b> app (App Store or Google Play).</li>
              <li>Tap <b>+</b>, then subscribe to the topic name below, exactly as written.</li>
              <li>Press <b>Save &amp; send test</b>. Your phone should buzz within a few seconds.</li>
            </ol>
            <label className="block">
              Topic name <span className="text-[color:var(--p-text-faint)]">(anyone who knows it can read your alerts, so keep it hard to guess)</span>
              <input name="ntfy_topic" value={topic} onChange={(e) => setTopic(e.target.value)} className={`${inputCls} mt-1 w-full`} />
            </label>
          </div>
        )}
        {!push && <input type="hidden" name="ntfy_topic" value={topic} />}
      </div>

      {state.error && <p className="text-sm text-[color:var(--p-error-text)]" role="alert">{state.error}</p>}
      {state.ok && <p className="text-sm" role="status">{state.ok}</p>}

      <div className="flex flex-wrap gap-3">
        <button className={btnCta} name="intent" value="save" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
        {push && (
          <button className={btnGhost} name="intent" value="test" disabled={pending}>Save &amp; send test</button>
        )}
      </div>
    </form>
  );
}
