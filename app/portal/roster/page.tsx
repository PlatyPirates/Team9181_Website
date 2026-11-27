import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";
import { requireMember, roleLabel } from "@/lib/auth";
import { CARD_COLS, displayName, gradeFor, type CardRow } from "@/lib/profile";
import { shownPhotoPath, signPhotos } from "@/lib/profile-server";
import Avatar from "@/components/profile/Avatar";

export const metadata: Metadata = { title: "Crew Roster" };

const ROLE_ORDER: Record<string, number> = { lead: 0, mentor: 1, student: 2, parent: 3 };

export default async function RosterPage() {
  await requireMember("/portal/roster");
  return (
    <main className="mx-auto max-w-[1200px] px-6 py-10">
      <span className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-[color:var(--p-accent)]">PORTAL</span>
      <h1 className="mt-1 font-display text-4xl font-extrabold text-[color:var(--p-text)]">Crew Roster</h1>
      <p className="mt-3 max-w-xl text-[color:var(--p-text-muted)]">Active members of FRC 9181. Open a card to see the full profile.</p>
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
  const [{ data, error }, { data: links }] = await Promise.all([
    sb.from("profiles").select(CARD_COLS + ", email").eq("status", "active").order("full_name", { ascending: true }),
    sb.from("guardian_links").select("parent_id, student_id"),
  ]);

  if (error) {
    return (
      <p className="rounded border border-[color:var(--p-error-border)] bg-[color:var(--p-error-bg)] p-4 text-sm text-[color:var(--p-error-text)]">
        Couldn&apos;t load the roster: {error.message}
      </p>
    );
  }
  const rows = ((data ?? []) as unknown as (CardRow & { email: string })[]).sort(
    (a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9) || displayName(a).localeCompare(displayName(b)),
  );
  if (rows.length === 0) {
    return (
      <p className="rounded border border-dashed border-[color:var(--p-border-strong)] p-8 text-center text-[color:var(--p-text-muted)]">
        No active members yet.
      </p>
    );
  }
  const byId = new Map(rows.map((r) => [r.id, r]));
  const childrenOf = new Map<string, string[]>();
  for (const l of (links ?? []) as { parent_id: string; student_id: string }[]) {
    const s = byId.get(l.student_id);
    if (!s) continue;
    childrenOf.set(l.parent_id, [...(childrenOf.get(l.parent_id) ?? []), displayName(s)]);
  }
  const signed = await signPhotos(rows.map((r) => shownPhotoPath(r) ?? ""));
  const crew = rows.filter((r) => r.role !== "parent");
  const parents = rows.filter((r) => r.role === "parent");

  return (
    <>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {crew.map((m) => (
          <MemberCard key={m.id} m={m} photoUrl={signed[shownPhotoPath(m) ?? ""] ?? null} parentOf={childrenOf.get(m.id)} />
        ))}
      </div>

      {parents.length ? (
        <details className="group mt-10">
          <summary className="flex cursor-pointer list-none items-center gap-3">
            <span className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-[color:var(--p-accent)]">
              Parents ({parents.length})
            </span>
            <span className="h-px flex-1 bg-[color:var(--p-border)]" />
            <span className="text-xs text-[color:var(--p-text-muted)] group-open:hidden">Show</span>
            <span className="hidden text-xs text-[color:var(--p-text-muted)] group-open:inline">Hide</span>
          </summary>
          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {parents.map((m) => (
              <MemberCard key={m.id} m={m} photoUrl={signed[shownPhotoPath(m) ?? ""] ?? null} parentOf={childrenOf.get(m.id)} />
            ))}
          </div>
        </details>
      ) : null}
    </>
  );
}

function MemberCard({ m, photoUrl, parentOf }: { m: CardRow & { email: string }; photoUrl: string | null; parentOf?: string[] }) {
  const grade = m.role === "student" ? gradeFor(m.grad_year) : null;
  return (
    <Link
      href={`/portal/roster/${m.username}`}
      className="portal-surface group flex gap-4 rounded-xl border border-[color:var(--p-border)] bg-[color:var(--p-surface)] p-5 transition hover:border-[color:var(--p-accent)]"
    >
      <Avatar seed={m.id} config={m.avatar_config} photoUrl={photoUrl} size={56} name={displayName(m)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-display text-lg font-extrabold text-[color:var(--p-text)] group-hover:underline">{m.full_name || m.username}</h3>
            <div className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--p-accent)]">@{m.username}</div>
          </div>
          <span className="shrink-0 rounded-full bg-[color:var(--p-chip-bg)] px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--p-chip-text)]">
            {roleLabel(m)}
          </span>
        </div>
        <dl className="mt-2 space-y-0.5 text-sm text-[color:var(--p-text-muted)]">
          {m.subteams?.length ? (
            <div><dt className="inline font-semibold text-[color:var(--p-text)]">Subteams: </dt><dd className="inline">{m.subteams.join(", ")}</dd></div>
          ) : null}
          {grade ? <div><dt className="sr-only">Grade</dt><dd>{grade}</dd></div> : null}
          {parentOf?.length ? (
            <div><dt className="inline font-semibold text-[color:var(--p-text)]">Parent of: </dt><dd className="inline">{parentOf.join(", ")}</dd></div>
          ) : null}
          <div className="truncate"><dt className="inline font-semibold text-[color:var(--p-text)]">Email: </dt><dd className="inline">{m.email}</dd></div>
        </dl>
      </div>
    </Link>
  );
}
