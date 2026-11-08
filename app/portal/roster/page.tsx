import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";
import { requireMember } from "@/lib/auth";

export const metadata: Metadata = { title: "Crew Roster" };

interface ProfileRow {
  id: string;
  full_name: string;
  username: string;
  email: string;
  role: "lead" | "mentor" | "student";
  lead_title: "coach" | "team_admin" | null;
  subteam: string | null;
  status: "pending" | "active" | "disabled";
}

export default async function RosterPage() {
  await requireMember("/portal/roster");
  return (
    <main className="mx-auto max-w-[1200px] px-6 py-10">
      <span className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-[color:var(--p-accent)]">PORTAL</span>
      <h1 className="mt-1 font-display text-4xl font-extrabold text-[color:var(--p-text)]">Crew Roster</h1>
      <p className="mt-3 max-w-xl text-[color:var(--p-text-muted)]">Active members of FRC 9181.</p>
      <div className="mt-8">
        <Suspense fallback={<p className="text-[color:var(--p-text-muted)]">Loading the crew…</p>}>
          <RosterList />
        </Suspense>
      </div>
    </main>
  );
}

async function RosterList() {
  const sb = await createClient();
  const { data, error } = await sb
    .from("profiles")
    .select("id, full_name, username, email, role, lead_title, subteam, status")
    .eq("status", "active")
    .order("role", { ascending: true })
    .order("full_name", { ascending: true });

  if (error) {
    return (
      <p className="rounded border border-[color:var(--p-error-border)] bg-[color:var(--p-error-bg)] p-4 text-sm text-[color:var(--p-error-text)]">
        Couldn&apos;t load the roster: {error.message}
      </p>
    );
  }
  const rows = (data ?? []) as ProfileRow[];
  if (rows.length === 0) {
    return (
      <p className="rounded border border-dashed border-[color:var(--p-border-strong)] p-8 text-center text-[color:var(--p-text-muted)]">
        No active members yet.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      {rows.map((m) => {
        const label =
          m.role === "lead"
            ? m.lead_title === "team_admin" ? "Team Admin" : m.lead_title === "coach" ? "Coach" : "Lead"
            : m.role === "mentor" ? "Mentor" : "Student";
        return (
          <div key={m.id} className="portal-surface rounded-xl border border-[color:var(--p-border)] bg-[color:var(--p-surface)] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-extrabold text-[color:var(--p-text)]">{m.full_name || m.username}</h3>
                <div className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--p-accent)]">@{m.username}</div>
              </div>
              <span className="rounded-full bg-[color:var(--p-chip-bg)] px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--p-chip-text)]">
                {label}
              </span>
            </div>
            <dl className="mt-3 space-y-1 text-sm text-[color:var(--p-text-muted)]">
              {m.subteam ? <div><dt className="inline font-semibold text-[color:var(--p-text)]">Subteam: </dt><dd className="inline">{m.subteam}</dd></div> : null}
              <div><dt className="inline font-semibold text-[color:var(--p-text)]">Email: </dt><dd className="inline">{m.email}</dd></div>
            </dl>
          </div>
        );
      })}
    </div>
  );
}
