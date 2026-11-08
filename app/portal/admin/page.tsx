import type { Metadata } from "next";
import { Suspense } from "react";
import { requireLead } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { approveMember, setRole, setStatus, sendPasswordReset } from "./actions";
import CreateAccountForm from "./CreateAccountForm";

export const metadata: Metadata = { title: "Admin" };

interface Row {
  id: string;
  full_name: string;
  username: string;
  email: string;
  role: "student" | "mentor" | "lead";
  lead_title: "coach" | "team_admin" | null;
  student_title: "team_captain" | "subteam_lead" | null;
  status: "pending" | "active" | "disabled";
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

      <section className="mt-12">
        <h2 className="mb-4 font-display text-2xl font-extrabold text-[color:var(--p-text)]">All members</h2>
        <Suspense fallback={<p className="text-[color:var(--p-text-muted)]">Loading…</p>}>
          <AllMembers />
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
    .select("id, full_name, username, email, role, lead_title, student_title, status")
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
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--p-border)]">
          {rows.map((m) => (
            <tr key={m.id}>
              <td className="px-4 py-3">
                <div className="font-semibold text-[color:var(--p-text)]">{m.full_name || m.username}</div>
                <div className="font-mono text-xs text-[color:var(--p-text-faint)]">@{m.username} · {m.email}</div>
              </td>
              <td className="px-4 py-3 align-top">
                <form action={setRole} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={m.id} />
                  <select name="role" defaultValue={m.role} className={selectCls}>
                    <option value="student">Student</option>
                    <option value="mentor">Mentor</option>
                    <option value="lead">Lead</option>
                  </select>
                  <select name="lead_title" defaultValue={m.lead_title ?? ""} className={selectCls}>
                    <option value="">— Lead title —</option>
                    <option value="coach">Coach</option>
                    <option value="team_admin">Team Admin</option>
                  </select>
                  <select name="student_title" defaultValue={m.student_title ?? ""} className={selectCls}>
                    <option value="">— Student title —</option>
                    <option value="team_captain">Team Captain</option>
                    <option value="subteam_lead">Sub-Team Lead</option>
                  </select>
                  <button className={btnSmall}>Save</button>
                </form>
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
