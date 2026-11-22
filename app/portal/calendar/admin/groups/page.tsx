import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { getCalendarContext } from "@/lib/calendar/server";
import CalendarNav from "../../CalendarNav";
import { addGroupMember, removeGroupMember } from "../actions";
import { btnSmall, card, chip, eyebrow, h1, inputCls, muted } from "../../styles";

export const metadata: Metadata = { title: "Calendar groups" };

const AUTO_NOTE: Record<string, string> = {
  students: "Starts with every active student.",
  mentors: "Starts with every active mentor.",
  student_leadership: "Starts with Team Captains and Sub-Team Leads.",
  mentor_leadership: "Starts with Coaches and Team Admins.",
};

export default async function GroupsPage() {
  const member = await requireMember("/portal/calendar/admin/groups");
  const ctx = await getCalendarContext(member);
  if (!ctx.perms.includes("manage_groups")) redirect("/portal/calendar");
  const sb = await createClient();
  const [{ data: rows }, { data: people }] = await Promise.all([
    sb.from("calendar_group_members").select("group_id, user_id, source, excluded"),
    sb.from("profiles").select("id, full_name, username, status").neq("status", "disabled").order("full_name"),
  ]);
  const name = new Map((people ?? []).map((p) => [p.id as string, (p.full_name as string) || (p.username as string)]));
  const groups = ctx.groups.filter((g) => g.kind === "members");

  return (
    <main className="mx-auto max-w-[1200px] px-6 py-10">
      <span className={eyebrow}>CALENDAR ADMIN</span>
      <h1 className={h1}>Groups</h1>
      <p className={`mt-3 max-w-2xl ${muted}`}>
        Groups decide who sees a team event. Each group fills itself from roles and titles; add anyone else by hand, or remove someone and they stay removed
        even if their role matches. All Members means everyone in these groups; Public Calendar means the website.
      </p>
      <CalendarNav active="groups" perms={ctx.perms} />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {groups.map((g) => {
          const mem = (rows ?? []).filter((r) => r.group_id === g.id);
          const active = mem.filter((r) => !r.excluded).sort((a, b) => (name.get(a.user_id) ?? "").localeCompare(name.get(b.user_id) ?? ""));
          const removed = mem.filter((r) => r.excluded);
          const inGroup = new Set(active.map((r) => r.user_id as string));
          return (
            <section key={g.id} className={`${card} p-5`}>
              <h2 className="font-display text-xl font-extrabold text-[color:var(--p-text)]">{g.name}</h2>
              {g.auto_rule && <p className={`text-xs ${muted}`}>{AUTO_NOTE[g.auto_rule]}</p>}
              <ul className="mt-3 divide-y divide-[color:var(--p-border)] text-sm">
                {active.map((r) => (
                  <li key={r.user_id} className="flex items-center justify-between gap-2 py-1.5">
                    <span>
                      {name.get(r.user_id) ?? "Unknown"}{" "}
                      <span className={`${chip} ${r.source === "auto" ? "text-[color:var(--p-text-faint)]" : "bg-[color:var(--p-hint-bg)]"}`}>{r.source === "auto" ? "auto" : "added"}</span>
                    </span>
                    <form action={removeGroupMember}>
                      <input type="hidden" name="group_id" value={g.id} />
                      <input type="hidden" name="user_id" value={r.user_id} />
                      <button className={`text-xs ${muted} underline hover:text-[color:var(--p-error-text)]`}>Remove</button>
                    </form>
                  </li>
                ))}
                {active.length === 0 && <li className={`py-2 ${muted}`}>Nobody yet.</li>}
              </ul>
              {removed.length > 0 && (
                <p className={`mt-2 text-xs ${muted}`}>
                  Removed by hand: {removed.map((r) => name.get(r.user_id) ?? "Unknown").join(", ")}
                </p>
              )}
              <form action={addGroupMember} className="mt-3 flex gap-2">
                <input type="hidden" name="group_id" value={g.id} />
                <select name="user_id" required defaultValue="" className={inputCls} aria-label={`Add someone to ${g.name}`}>
                  <option value="" disabled>Add someone…</option>
                  {(people ?? []).filter((p) => !inGroup.has(p.id as string)).map((p) => (
                    <option key={p.id as string} value={p.id as string}>{(p.full_name as string) || (p.username as string)}</option>
                  ))}
                </select>
                <button className={btnSmall}>Add</button>
              </form>
            </section>
          );
        })}
      </div>
    </main>
  );
}
