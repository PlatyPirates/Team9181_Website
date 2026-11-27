import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { roleLabel, type LeadTitle, type Role, type StudentTitle } from "@/lib/auth";
import { formatDate, scopeLabel, type GrantScope } from "@/lib/profile";
import { signPhotos } from "@/lib/profile-server";
import { decideLinkRequest, decidePhoto, revokeGrant, setAutoApprove } from "./profile-actions";
import GrantForm from "./GrantForm";

const btnSmall =
  "rounded border border-[color:var(--p-border-strong)] px-2 py-1 text-xs text-[color:var(--p-accent)] hover:bg-[color:var(--p-cta-bg)] hover:text-[color:var(--p-cta-text)]";
const btnCta =
  "rounded border-2 border-[color:var(--p-cta-bg)] bg-[color:var(--p-cta-bg)] px-3 py-1 text-sm font-bold text-[color:var(--p-cta-text)] hover:bg-[color:var(--p-cta-hover-bg)]";
const selectCls =
  "rounded border border-[color:var(--p-border)] bg-[color:var(--p-input-bg)] px-2 py-1 text-[color:var(--p-text)]";
const box = "portal-surface rounded border border-[color:var(--p-border)] bg-[color:var(--p-surface)] p-4";
const empty = "rounded border border-dashed border-[color:var(--p-border-strong)] p-6 text-[color:var(--p-text-muted)]";

interface Person {
  id: string;
  full_name: string;
  username: string;
  role: Role;
  lead_title: LeadTitle;
  student_title: StudentTitle;
  mentor_title: string | null;
  status: string;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, "").trim();

/** Best guess at which student a typed name means: exact, then shared words. */
function guessStudent(name: string, students: Person[]): string {
  const n = norm(name);
  const words = new Set(n.split(/\s+/).filter((w) => w.length > 1));
  let best = "";
  let score = 0;
  for (const s of students) {
    const sn = norm(s.full_name || s.username);
    if (sn === n) return s.id;
    const hit = sn.split(/\s+/).filter((w) => words.has(w)).length;
    if (hit > score) { score = hit; best = s.id; }
  }
  return best;
}

export async function LinkRequests() {
  const sb = await createClient();
  const [{ data: reqs }, { data: people }] = await Promise.all([
    sb.from("guardian_link_requests").select("id, parent_id, student_name, created_at").eq("status", "pending").order("created_at"),
    sb.from("profiles").select("id, full_name, username, role, lead_title, student_title, mentor_title, status").order("full_name"),
  ]);
  const all = (people ?? []) as Person[];
  const byId = new Map(all.map((p) => [p.id, p]));
  const students = all.filter((p) => p.role === "student" && p.status !== "disabled");
  const rows = (reqs ?? []) as { id: string; parent_id: string; student_name: string; created_at: string }[];
  if (rows.length === 0) return <p className={empty}>No parent link requests waiting.</p>;
  return (
    <ul className="space-y-2">
      {rows.map((r) => {
        const parent = byId.get(r.parent_id);
        return (
          <li key={r.id} className={`${box} flex flex-wrap items-center justify-between gap-3`}>
            <div className="text-sm">
              <strong>{parent ? parent.full_name || parent.username : "Unknown"}</strong>
              {parent ? <span className="text-[color:var(--p-text-muted)]"> ({roleLabel(parent)}{parent.status === "pending" ? ", account not approved yet" : ""})</span> : null}{" "}
              <span className="text-[color:var(--p-text-muted)]">says they&apos;re a parent of</span> <strong>{r.student_name}</strong>
              <div className="text-xs text-[color:var(--p-text-faint)]">Asked {formatDate(r.created_at)}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <form action={decideLinkRequest} className="flex items-center gap-2">
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="decision" value="approve" />
                <select name="student_id" required defaultValue={guessStudent(r.student_name, students)} className={selectCls} aria-label="Student">
                  <option value="" disabled>Which student?</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.full_name || s.username}</option>
                  ))}
                </select>
                <button className={btnCta}>Link</button>
              </form>
              <form action={decideLinkRequest}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="decision" value="decline" />
                <button className="text-xs text-[color:var(--p-text-faint)] underline hover:text-[color:var(--p-error-text)]">Decline</button>
              </form>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export async function PhotoApprovals() {
  const sb = await createClient();
  const [{ data: pending }, { data: auto }] = await Promise.all([
    sb.from("profiles").select("id, full_name, username, photo_path").eq("photo_status", "pending").not("photo_path", "is", null),
    sb.from("profiles").select("id, full_name, username").eq("photo_auto_approve", true).eq("role", "student").order("full_name"),
  ]);
  const rows = (pending ?? []) as { id: string; full_name: string; username: string; photo_path: string }[];
  const signed = await signPhotos(rows.map((r) => r.photo_path));
  const autoRows = (auto ?? []) as { id: string; full_name: string; username: string }[];
  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <p className={empty}>No student photos waiting.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <li key={r.id} className={`${box} flex items-center gap-3`}>
              {signed[r.photo_path] ? (
                // eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL
                <img src={signed[r.photo_path]} alt={`Photo from ${r.full_name}`} width={72} height={72} className="h-[72px] w-[72px] rounded-full object-cover" />
              ) : (
                <div className="h-[72px] w-[72px] rounded-full bg-[color:var(--p-hint-bg)]" />
              )}
              <div className="min-w-0 space-y-1.5">
                <Link href={`/portal/roster/${r.username}`} className="block truncate font-semibold hover:underline">{r.full_name || r.username}</Link>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    ["approve", "Approve"],
                    ["approve_always", "Approve + trust future photos"],
                    ["reject", "Reject"],
                  ].map(([d, label]) => (
                    <form key={d} action={decidePhoto}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="decision" value={d} />
                      <button className={d === "approve" ? btnCta : btnSmall}>{label}</button>
                    </form>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {autoRows.length ? (
        <div className="text-sm text-[color:var(--p-text-muted)]">
          <span className="font-semibold text-[color:var(--p-text)]">Photos approved automatically for: </span>
          {autoRows.map((r, i) => (
            <span key={r.id} className="inline-flex items-center gap-1">
              {r.full_name || r.username}
              <form action={setAutoApprove} className="inline">
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="value" value="off" />
                <button className="text-xs underline hover:text-[color:var(--p-error-text)]" aria-label={`Stop auto-approving ${r.full_name}`}>(stop)</button>
              </form>
              {i < autoRows.length - 1 ? ", " : ""}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export async function AccessGrants() {
  const sb = await createClient();
  const [{ data: grants }, { data: people }] = await Promise.all([
    sb.from("profile_access_grants").select("id, grantee, scope, subteams, expires_on, granted_by, granted_at").is("revoked_at", null).order("granted_at", { ascending: false }),
    sb.from("profiles").select("id, full_name, username, role, lead_title, student_title, mentor_title, status").order("full_name"),
  ]);
  const all = (people ?? []) as Person[];
  const byId = new Map(all.map((p) => [p.id, p]));
  const eligible = all
    .filter((p) => p.status === "active" && (p.role === "mentor" || (p.role === "student" && !!p.student_title)))
    .map((p) => ({ id: p.id, label: `${p.full_name || p.username} (${roleLabel(p)})` }));
  const rows = (grants ?? []) as {
    id: string; grantee: string; scope: GrantScope; subteams: string[] | null; expires_on: string | null; granted_by: string | null; granted_at: string;
  }[];
  const today = new Date().toISOString().slice(0, 10);
  const name = (id: string | null) => (id ? byId.get(id)?.full_name || byId.get(id)?.username || "Unknown" : "Unknown");
  return (
    <div className="space-y-4">
      <GrantForm people={eligible} />
      {rows.length === 0 ? (
        <p className={empty}>Nobody has extra access yet.</p>
      ) : (
        <div className="portal-surface overflow-x-auto rounded border border-[color:var(--p-border)] bg-[color:var(--p-surface)]">
          <table className="w-full text-left text-sm text-[color:var(--p-text)]">
            <thead className="border-b border-[color:var(--p-border-strong)] font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--p-accent)]">
              <tr>
                <th className="px-4 py-3">Who</th>
                <th className="px-4 py-3">Access</th>
                <th className="px-4 py-3">Covers</th>
                <th className="px-4 py-3">Until</th>
                <th className="px-4 py-3">Given by</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--p-border)]">
              {rows.map((g) => {
                const expired = !!g.expires_on && g.expires_on < today;
                return (
                  <tr key={g.id} className={expired ? "opacity-60" : ""}>
                    <td className="px-4 py-2 font-semibold">{name(g.grantee)}</td>
                    <td className="px-4 py-2">{scopeLabel(g.scope)}</td>
                    <td className="px-4 py-2">{g.subteams?.length ? g.subteams.join(", ") : "Whole team"}</td>
                    <td className="px-4 py-2">{g.expires_on ? `${formatDate(`${g.expires_on}T12:00:00Z`)}${expired ? " (ended)" : ""}` : "Until removed"}</td>
                    <td className="px-4 py-2 text-[color:var(--p-text-muted)]">{name(g.granted_by)}, {formatDate(g.granted_at)}</td>
                    <td className="px-4 py-2 text-right">
                      <form action={revokeGrant}>
                        <input type="hidden" name="id" value={g.id} />
                        <button className={btnSmall}>Remove</button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
