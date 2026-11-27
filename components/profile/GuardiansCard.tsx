"use client";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { deleteGuardian, saveGuardian, type SaveState } from "@/app/portal/profile/actions";
import { AvatarSvg } from "./Avatar";
import { LockIcon } from "./SectionCard";
import { btnCta, btnGhost, btnSmall, card, errorBox, inputCls, labelCls, muted } from "./styles";
import type { AvatarConfig } from "@/lib/profile";

export interface ParentItem {
  id: string;
  username: string;
  name: string;
  avatar: AvatarConfig | null;
  photoUrl: string | null;
  phone: string | null;
  email: string | null;
  employer: string | null;
}

export interface GuardianItem {
  id: string;
  name: string;
  relationship: string | null;
  email: string | null;
  phone: string | null;
  employer: string | null;
}

interface Props {
  subjectId: string;
  parents: ParentItem[];
  guardians: GuardianItem[];
  canEdit: boolean;
  showContact: boolean;
  showEmployer: boolean;
  note: string;
  tag?: string | null;
  missing: boolean;
}

export default function GuardiansCard({ subjectId, parents, guardians, canEdit, showContact, showEmployer, note, tag, missing }: Props) {
  const [adding, setAdding] = useState(false);
  return (
    <section id="guardians" className={`${card} scroll-mt-24 p-5`}>
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-extrabold text-[color:var(--p-text)]">Parents and guardians</h2>
          <p className={`mt-0.5 flex items-start gap-1 text-xs ${muted}`}>
            <LockIcon /> {note}
          </p>
          {tag ? (
            <p className="mt-1.5 inline-block rounded-full bg-[color:var(--p-hint-bg)] px-2 py-0.5 text-[0.7rem] text-[color:var(--p-text-muted)]">{tag}</p>
          ) : null}
        </div>
      </header>

      {parents.length === 0 && guardians.length === 0 ? (
        <p className={`text-sm ${missing ? "text-[color:var(--p-error-text)]" : muted}`}>
          {missing ? "Needed: add at least one parent or guardian." : "No parents or guardians listed yet."}
        </p>
      ) : null}

      <ul className="space-y-3">
        {parents.map((p) => (
          <li key={p.id} className="flex items-start gap-3">
            {p.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL
              <img src={p.photoUrl} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <AvatarSvg seed={p.id} config={p.avatar} size={40} label={`${p.name}'s avatar`} />
            )}
            <div className="text-sm">
              <Link href={`/portal/roster/${p.username}`} className="font-semibold text-[color:var(--p-text)] hover:underline">
                {p.name}
              </Link>
              <span className="ml-2 rounded-full bg-[color:var(--p-chip-bg)] px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-[color:var(--p-chip-text)]">
                Portal account
              </span>
              {showContact ? (
                <div className={muted}>
                  {[p.phone, p.email].filter(Boolean).join(" · ") || "No contact info yet"}
                </div>
              ) : null}
              {showEmployer && p.employer ? <div className={muted}>Works at {p.employer}</div> : null}
            </div>
          </li>
        ))}
        {showContact &&
          guardians.map((g) => <GuardianRow key={g.id} subjectId={subjectId} g={g} canEdit={canEdit} showEmployer={showEmployer} />)}
      </ul>

      {canEdit && guardians.length < 2 ? (
        adding ? (
          <GuardianForm subjectId={subjectId} onDone={() => setAdding(false)} />
        ) : (
          <button type="button" className={`${btnSmall} mt-4`} onClick={() => setAdding(true)}>
            Add a guardian without a portal account
          </button>
        )
      ) : null}
      {canEdit ? (
        <p className={`mt-3 text-xs ${muted}`}>
          Parents with their own portal account show up here once a Lead links them. They can ask for the link from their Profile page.
        </p>
      ) : null}
    </section>
  );
}

function GuardianRow({ subjectId, g, canEdit, showEmployer }: { subjectId: string; g: GuardianItem; canEdit: boolean; showEmployer: boolean }) {
  const [editing, setEditing] = useState(false);
  if (editing) return <li><GuardianForm subjectId={subjectId} g={g} onDone={() => setEditing(false)} /></li>;
  return (
    <li className="flex items-start justify-between gap-3 text-sm">
      <div>
        <div className="font-semibold text-[color:var(--p-text)]">
          {g.name}
          {g.relationship ? <span className={`font-normal ${muted}`}> · {g.relationship}</span> : null}
        </div>
        <div className={muted}>{[g.phone, g.email].filter(Boolean).join(" · ")}</div>
        {showEmployer && g.employer ? <div className={muted}>Works at {g.employer}</div> : null}
      </div>
      {canEdit ? (
        <div className="flex shrink-0 gap-2">
          <button type="button" className={btnSmall} onClick={() => setEditing(true)}>
            Edit
          </button>
          <form action={deleteGuardian.bind(null, subjectId)}>
            <input type="hidden" name="id" value={g.id} />
            <button className="text-xs text-[color:var(--p-text-faint)] underline hover:text-[color:var(--p-error-text)]">Remove</button>
          </form>
        </div>
      ) : null}
    </li>
  );
}

function GuardianForm({ subjectId, g, onDone }: { subjectId: string; g?: GuardianItem; onDone: () => void }) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveGuardian.bind(null, subjectId), {});
  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, state.savedAt, onDone]);
  const input = (name: keyof GuardianItem, label: string, type = "text", required = false) => (
    <label className="block">
      <span className={labelCls}>
        {label}
        {required ? <span className="text-[color:var(--p-error-text)]"> *</span> : null}
      </span>
      <input name={name} type={type} defaultValue={(g?.[name] as string) ?? ""} required={required} className={inputCls} />
    </label>
  );
  return (
    <form action={action} className="mt-4 space-y-3 rounded border border-dashed border-[color:var(--p-border-strong)] p-4">
      {g ? <input type="hidden" name="id" value={g.id} /> : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {input("name", "Name", "text", true)}
        {input("relationship", "Relationship")}
        {input("email", "Email", "email")}
        {input("phone", "Phone", "tel")}
        {input("employer", "Employer")}
      </div>
      {state.error ? <p className={errorBox}>{state.error}</p> : null}
      <div className="flex gap-2">
        <button className={btnCta} disabled={pending}>{pending ? "Saving…" : "Save"}</button>
        <button type="button" className={btnGhost} onClick={onDone} disabled={pending}>Cancel</button>
      </div>
    </form>
  );
}
