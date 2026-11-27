"use client";
import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { requestStudentLink, withdrawLinkRequest, type SaveState } from "@/app/portal/profile/actions";
import { AvatarSvg } from "./Avatar";
import { btnCta, card, errorBox, inputCls, muted } from "./styles";
import type { AvatarConfig } from "@/lib/profile";

interface StudentItem {
  id: string;
  username: string;
  name: string;
  avatar: AvatarConfig | null;
  photoUrl: string | null;
  detail: string;
}

interface Props {
  students: StudentItem[];
  requests: { id: string; student_name: string; created_at: string }[];
  isSelf: boolean;
  collapsed: boolean;   // not a parent yet: tuck the request form away
}

export default function StudentsCard({ students, requests, isSelf, collapsed }: Props) {
  const body = (
    <>
      {students.length ? (
        <ul className="space-y-3">
          {students.map((s) => (
            <li key={s.id} className="flex items-center gap-3">
              {s.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL
                <img src={s.photoUrl} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <AvatarSvg seed={s.id} config={s.avatar} size={40} label={`${s.name}'s avatar`} />
              )}
              <div className="text-sm">
                <Link href={`/portal/roster/${s.username}`} className="font-semibold text-[color:var(--p-text)] hover:underline">
                  {s.name}
                </Link>
                <div className={muted}>{s.detail}</div>
              </div>
              {isSelf ? (
                <Link href={`/portal/roster/${s.username}`} className="ml-auto text-xs text-[color:var(--p-accent)] underline">
                  View and edit profile
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      ) : !isSelf ? (
        <p className={`text-sm ${muted}`}>No linked students.</p>
      ) : null}

      {isSelf && requests.length ? (
        <ul className="mt-4 space-y-1.5 text-sm">
          {requests.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 rounded bg-[color:var(--p-hint-bg)] px-3 py-2">
              <span>
                <strong>{r.student_name}</strong> <span className={muted}>· waiting for a Lead to approve</span>
              </span>
              <form action={withdrawLinkRequest}>
                <input type="hidden" name="id" value={r.id} />
                <button className="text-xs text-[color:var(--p-text-faint)] underline hover:text-[color:var(--p-error-text)]">Cancel</button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}

      {isSelf ? <RequestForm /> : null}
    </>
  );

  return (
    <section id="students" className={`${card} scroll-mt-24 p-5`}>
      {collapsed ? (
        <details>
          <summary className="cursor-pointer font-display text-xl font-extrabold text-[color:var(--p-text)]">Are you a parent of a student?</summary>
          <p className={`mb-3 mt-1 text-sm ${muted}`}>
            Mentors and coaches can be parents too. Ask to be linked to your student and a Lead will approve it. You&apos;ll then be able to fill in their
            profile and act for them in the calendar.
          </p>
          {body}
        </details>
      ) : (
        <>
          <h2 className="mb-3 font-display text-xl font-extrabold text-[color:var(--p-text)]">{isSelf ? "Your students" : "Students"}</h2>
          {body}
        </>
      )}
    </section>
  );
}

function RequestForm() {
  const [state, action, pending] = useActionState<SaveState, FormData>(requestStudentLink, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok, state.savedAt]);
  return (
    <form ref={ref} action={action} className="mt-4 space-y-2">
      <label className="block text-sm">
        <span className="mb-1 block font-semibold text-[color:var(--p-text)]">Link another student</span>
        <div className="flex gap-2">
          <input name="student_name" placeholder="Student's full name" className={inputCls} required minLength={2} maxLength={120} />
          <button className={`${btnCta} shrink-0`} disabled={pending}>{pending ? "Sending…" : "Ask"}</button>
        </div>
      </label>
      {state.error ? <p className={errorBox}>{state.error}</p> : null}
      {state.ok ? <p className={`text-xs ${muted}`}>Sent. A Lead will approve the link.</p> : null}
    </form>
  );
}
