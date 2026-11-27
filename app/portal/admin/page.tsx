import type { Metadata } from "next";
import { Suspense } from "react";
import { requireLead } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { approveMember, linkGuardian, setStatus, setSubteams, sendPasswordReset, unlinkGuardian } from "./actions";
import { SUBTEAMS } from "@/lib/profile";
import CreateAccountForm from "./CreateAccountForm";
import RoleEditor from "./RoleEditor";
import { AccessGrants, LinkRequests, PhotoApprovals } from "./ProfileAdmin";

export const metadata: Metadata = { title: "Admin" };

interface Row {
  id: string;
  full_name: string;
  username: string;
  email: string;
  role: "student" | "mentor" | "lead" | "parent";
  lead_title: string | null;
  student_title: string | null;
  mentor_title: string | null;
  has_student: boolean | null;
  is_team_admin: boolean | null;
  is_alumni: boolean | null;
  status: "pending" | "active" | "disabled";
  subteams: string[];
}

const btnSmall =
  "rounded border border-[color:var(--p-border-strong)] px-2 py-1 text-xs text-[color:var(--p-accent)] hover:bg-[color:var(--p-cta-bg)] hover:text-[color:var(--p-cta-text)]";
const btnCta =
  "rounded border-2 border-[color:var(--p-cta-bg)] bg-[color:var(--p-cta-bg)] px-4 py-2 font-bold text-[color:var(--p-cta-text)] hover:bg-[color:var(--p-cta-hover-bg)]";
const selectCls =
  "rounded border border-[color:var(--p-border)] bg-[color:var(--p-input-bg)] px-2 py-1 text-[color:var(--p-text)]";

export default async function AdminPage() {
  await requireLead("/portal/admin");
  return (
    <main className="mx-auto max-w-[1200px] px-6 py-10">
      <span className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-[color:var(--p-accent)]">LEAD</span>
      <h1 className="mt-1 font-display text-4xl font-extrabold text-[color:var(--p-text)]">Admin</h1>
      <p className="mt-3 max-w-2xl text-[color:var(--p-text-muted)]">
        Approve new accounts, change roles, create accounts for members who didn&apos;t sign up themselves,
        and send password resets.
      </p>

      <section className="mt-10">
        <h2 className="mb-4 font-display text-2xl font-extrabold text-[color:var(--p-text)]">Pending approvals</h2>
        <Suspense fallback={<p className="text-[color:var(--p-text-muted)]">Loading…</p>}>
          <PendingList />
        </Suspense>
      </section>

      <section className="mt-12" id="link-requests">
        <h2 className="mb-2 font-display text-2xl font-extrabold text-[color:var(--p-text)]">Parent link requests</h2>
        <p className="mb-4 max-w-2xl text-[color:var(--p-text-muted)]">
          Parents ask to be linked to their students when they sign up or from their Profile. Check the student, then link.
        </p>
        <Suspense fallback={<p className="text-[color:var(--p-text-muted)]">Loading…</p>}>
          <LinkRequests />
        </Suspense>
      </section>

      <section className="mt-12" id="photos">
        <h2 className="mb-2 font-display text-2xl font-extrabold text-[color:var(--p-text)]">Student photos</h2>
        <p className="mb-4 max-w-2xl text-[color:var(--p-text-muted)]">
          A student&apos;s uploaded photo stays hidden until a Lead approves it; everyone sees their avatar meanwhile.
          Mentors&apos; and parents&apos; photos don&apos;t need approval.
        </p>
        <Suspense fallback={<p className="text-[color:var(--p-text-muted)]">Loading…</p>}>
          <PhotoApprovals />
        </Suspense>
      </section>

      <section className="mt-12" id="access">
        <h2 className="mb-2 font-display text-2xl font-extrabold text-[color:var(--p-text)]">Profile access</h2>
        <p className="mb-4 max-w-2xl text-[color:var(--p-text-muted)]">
          Let a mentor, Team Captain or Sub-Team Lead see specific private profile sections, read-only. Every change is
          recorded in that person&apos;s profile history.
        </p>
        <Suspense fallback={<p className="text-[color:var(--p-text-muted)]">Loading…</p>}>
          <AccessGrants />
        </Suspense>
      </section>

      <section className="mt-12">
        <h2 className="mb-4 font-display text-2xl font-extrabold text-[color:var(--p-text)]">All members</h2>
        <Suspense fallback={<p className="text-[color:var(--p-text-muted)]">Loading…</p>}>
          <AllMembers />
        </Suspense>
      </section>

      <section className="mt-12" id="parents">
        <h2 className="mb-2 font-display text-2xl font-extrabold text-[color:var(--p-text)]">Parents and students</h2>
        <p className="mb-4 max-w-2xl text-[color:var(--p-text-muted)]">
          Link a parent&apos;s account to their student. Anyone can be a parent, including a mentor or coach; they keep
          their own role and also get parent access to the calendar (acting for their student). Use the
          &ldquo;Parent only&rdquo; role above for parents with no other team role.
        </p>
        <Suspense fallback={<p className="text-[color:var(--p-text-muted)]">Loading…</p>}>
          <GuardianLinks />
        </Suspense>
      </section>

      <section className="mt-12">
        <h2 className="mb-4 font-display text-2xl font-extrabold text-[color:var(--p-text)]">Create an account</h2>
        <p className="mb-4 max-w-xl text-[color:var(--p-text-muted)]">
          Use this for members who shouldn&apos;t self-register (e.g. coaches, mentors).
          The account starts active with the role you pick.
        </p>
        <CreateAccountForm />
      </section>
    </main>
  );
}

async function PendingList() {
  const sb = await createClient();
  const { data } = await sb
    .from("profiles")
    .select("id, full_name, username, email, role, lead_title, student_title, status")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  const rows = (data ?? []) as Row[];
  if (rows.length === 0)
    return (
      <p className="rounded border border-dashed border-[color:var(--p-border-strong)] p-6 text-[color:var(--p-text-muted)]">
        Nothing waiting.
      </p>
    );
  return (
    <ul className="space-y-2">
      {rows.map((m) => (
        <li
          key={m.id}
          className="portal-surface flex flex-wrap items-center justify-between gap-3 rounded border border-[color:var(--p-border)] bg-[color:var(--p-surface)] p-4"
        >
          <div>
            <div className="font-display text-lg font-extrabold text-[color:var(--p-text)]">{m.full_name || m.username}</div>
            <div className="font-mono text-xs text-[color:var(--p-text-muted)]">@{m.username} · {m.email}</div>
          </div>
          <form action={approveMember}>
            <input type="hidden" name="id" value={m.id} />
            <button className={btnCta}>Approve</button>
          </form>
        </li>
      ))}
    </ul>
  );
}

async function AllMembers() {
  const sb = await createClient();
  const { data } = await sb
    .from("profiles")
    .select("id, full_name, username, email, role, lead_title, student_title, mentor_title, has_student, is_team_admin, is_alumni, status, subteams")
    .order("role", { ascending: true })
    .order("full_name", { ascending: true });
  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return <p className="text-[color:var(--p-text-muted)]">No accounts yet.</p>;
  return (
    <div className="portal-surface overflow-x-auto rounded border border-[color:var(--p-border)] bg-[color:var(--p-surface)]">
      <table className="w-full text-left text-sm text-[color:var(--p-text)]">
        <thead className="border-b border-[color:var(--p-border-strong)] font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--p-accent)]">
          <tr>
            <th className="px-4 py-3">Member</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Subteams</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--p-border)]">
          {rows.map((m) => (
            <tr key={m.id}>
              <td className="px-4 py-3">
                <Link href={`/portal/roster/${m.username}`} className="font-semibold text-[color:var(--p-text)] hover:underline">{m.full_name || m.username}</Link>
                <div className="font-mono text-xs text-[color:var(--p-text-faint)]">@{m.username} · {m.email}</div>
              </td>
              <td className="px-4 py-3 align-top">
                <RoleEditor
                  id={m.id}
                  role={m.role}
                  lead_title={m.lead_title}
                  student_title={m.student_title}
                  mentor_title={m.mentor_title}
                  has_student={m.has_student}
                  is_team_admin={m.is_team_admin}
                  is_alumni={m.is_alumni}
                />
              </td>
              <td className="px-4 py-3 align-top">
                {m.role === "parent" ? (
                  <span className="text-xs text-[color:var(--p-text-faint)]">—</span>
                ) : (
                  <form action={setSubteams} className="flex flex-wrap items-center gap-1.5">
                    <input type="hidden" name="id" value={m.id} />
                    {SUBTEAMS.map((t) => (
                      <label key={t} className="flex items-center gap-1 text-xs">
                        <input type="checkbox" name="subteams" value={t} defaultChecked={(m.subteams ?? []).includes(t)} />
                        {t}
                      </label>
                    ))}
                    <button className={btnSmall}>Save</button>
                  </form>
                )}
              </td>
              <td className="px-4 py-3 align-top">
                <form action={setStatus} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={m.id} />
                  <select name="status" defaultValue={m.status} className={selectCls}>
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </select>
                  <button className={btnSmall}>Save</button>
                </form>
              </td>
              <td className="px-4 py-3 text-right align-top">
                <form action={sendPasswordReset}>
                  <input type="hidden" name="email" value={m.email} />
                  <button className={btnSmall}>Email reset link</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function GuardianLinks() {
  const sb = await createClient();
  const [{ data: people }, { data: links }] = await Promise.all([
    sb.from("profiles").select("id, full_name, username, role, status").order("full_name"),
    sb.from("guardian_links").select("parent_id, student_id"),
  ]);
  const all = (people ?? []) as { id: string; full_name: string; username: string; role: string; status: string }[];
  const name = new Map(all.map((p) => [p.id, p.full_name || p.username]));
  const students = all.filter((p) => p.role === "student" && p.status !== "disabled");
  const adults = all.filter((p) => p.role !== "student" && p.status !== "disabled");
  return (
    <div className="portal-surface rounded border border-[color:var(--p-border)] bg-[color:var(--p-surface)] p-4">
      <form action={linkGuardian} className="flex flex-wrap items-center gap-2">
        <select name="parent_id" required defaultValue="" className={selectCls} aria-label="Parent">
          <option value="" disabled>Parent…</option>
          {adults.map((p) => (
            <option key={p.id} value={p.id}>{p.full_name || p.username}</option>
          ))}
        </select>
        <span className="text-sm text-[color:var(--p-text-muted)]">is a parent of</span>
        <select name="student_id" required defaultValue="" className={selectCls} aria-label="Student">
          <option value="" disabled>Student…</option>
          {students.map((p) => (
            <option key={p.id} value={p.id}>{p.full_name || p.username}</option>
          ))}
        </select>
        <button className={btnSmall}>Link</button>
      </form>
      {(links ?? []).length > 0 ? (
        <ul className="mt-4 divide-y divide-[color:var(--p-border)] text-sm">
          {(links ?? []).map((l) => (
            <li key={`${l.parent_id}-${l.student_id}`} className="flex items-center justify-between gap-3 py-2">
              <span>
                <strong>{name.get(l.parent_id as string) ?? "Unknown"}</strong>{" "}
                <span className="text-[color:var(--p-text-muted)]">is a parent of</span>{" "}
                <strong>{name.get(l.student_id as string) ?? "Unknown"}</strong>
              </span>
              <form action={unlinkGuardian}>
                <input type="hidden" name="parent_id" value={l.parent_id as string} />
                <input type="hidden" name="student_id" value={l.student_id as string} />
                <button className="text-xs text-[color:var(--p-text-faint)] underline hover:text-[color:var(--p-error-text)]">Unlink</button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-[color:var(--p-text-muted)]">No links yet.</p>
      )}
    </div>
  );
}
