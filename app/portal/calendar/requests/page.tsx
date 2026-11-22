import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { EVENT_COLS, getCalendarContext } from "@/lib/calendar/server";
import { describeRecurrence, parseRRule } from "@/lib/calendar/recurrence";
import { formatRange } from "@/lib/calendar/time";
import type { CalendarEventRow } from "@/lib/calendar/types";
import CalendarNav from "../CalendarNav";
import { decideRequest } from "../actions";
import { btnCta, btnGhost, card, chip, eyebrow, h1, inputCls, labelCls, muted } from "../styles";

export const metadata: Metadata = { title: "Calendar requests" };

export default async function RequestsPage() {
  const member = await requireMember("/portal/calendar/requests");
  const ctx = await getCalendarContext(member);
  if (!ctx.perms.includes("approve_requests")) redirect("/portal/calendar");
  const sb = await createClient();
  const { data } = await sb.from("calendar_events").select(EVENT_COLS).eq("status", "pending").order("starts_at");
  const rows = (data ?? []) as CalendarEventRow[];
  const ids = rows.map((r) => r.id);
  const people = [...new Set(rows.flatMap((r) => [r.created_by, r.on_behalf_of]).filter(Boolean))] as string[];
  const [{ data: eg }, { data: profs }] = await Promise.all([
    ids.length ? sb.from("calendar_event_groups").select("event_id, group_id").in("event_id", ids) : Promise.resolve({ data: [] }),
    people.length ? sb.from("profiles").select("id, full_name, username").in("id", people) : Promise.resolve({ data: [] }),
  ]);
  const names = new Map((profs ?? []).map((p) => [p.id as string, (p.full_name as string) || (p.username as string)]));
  const groupsBy = new Map<string, string[]>();
  for (const g of eg ?? []) groupsBy.set(g.event_id as string, [...(groupsBy.get(g.event_id as string) ?? []), g.group_id as string]);
  const pickable = ctx.groups.filter((g) => g.kind !== "public");
  const pub = ctx.groups.find((g) => g.kind === "public");

  return (
    <main className="mx-auto max-w-[1200px] px-6 py-10">
      <span className={eyebrow}>APPROVALS</span>
      <h1 className={h1}>Event requests</h1>
      <p className={`mt-3 max-w-2xl ${muted}`}>
        Members without the &ldquo;Post team events&rdquo; box send their team events here. Check who should see it, then approve or reject. The requester gets an email or phone alert either way.
      </p>
      <CalendarNav active="requests" perms={ctx.perms} pendingCount={rows.length} />

      {rows.length === 0 ? (
        <p className="mt-6 rounded border border-dashed border-[color:var(--p-border-strong)] p-8 text-center text-[color:var(--p-text-muted)]">
          Nothing waiting. Nice.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 lg:grid-cols-2">
          {rows.map((r) => {
            const groups = groupsBy.get(r.id) ?? [];
            const cat = ctx.categories.find((c) => c.id === r.category_id);
            return (
              <li key={r.id} className={`${card} p-5`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-display text-xl font-extrabold text-[color:var(--p-text)]">{r.title}</h2>
                    <p className="text-sm font-semibold">{formatRange(r.starts_at, r.ends_at, r.all_day)}</p>
                    {r.rrule && <p className={`text-xs ${muted}`}>{describeRecurrence(parseRRule(r.rrule), r.starts_at)}</p>}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {cat && <span className={`${chip} text-white`} style={{ background: cat.color }}>{cat.name}</span>}
                    {r.custom_label && <span className={`${chip} border border-[color:var(--p-border-strong)]`}>{r.custom_label}</span>}
                  </div>
                </div>
                <p className={`mt-2 text-xs ${muted}`}>
                  Requested by {names.get(r.created_by ?? "") ?? "someone"}
                  {r.on_behalf_of ? ` for ${names.get(r.on_behalf_of) ?? "their student"} (by parent)` : ""}
                </p>
                {r.location && <p className="mt-2 text-sm"><strong>Where:</strong> {r.location}</p>}
                {r.description && <p className="mt-2 whitespace-pre-line text-sm">{r.description}</p>}
                {r.notes && <p className={`mt-2 whitespace-pre-line text-sm ${muted}`}>Notes: {r.notes}</p>}

                <form action={decideRequest} className="mt-4 grid gap-3 border-t border-[color:var(--p-border)] pt-3">
                  <input type="hidden" name="id" value={r.id} />
                  <fieldset>
                    <legend className={labelCls}>Who sees it</legend>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      {pickable.map((g) => (
                        <label key={g.id} className="flex items-center gap-2">
                          <input type="checkbox" name="group" value={g.id} defaultChecked={groups.includes(g.id)} /> {g.name}
                        </label>
                      ))}
                      {pub && ctx.perms.includes("mark_public") && (
                        <label className="flex items-center gap-2">
                          <input type="checkbox" name="public" defaultChecked={groups.includes(pub.id)} /> Public Calendar
                        </label>
                      )}
                    </div>
                  </fieldset>
                  <input name="note" className={inputCls} placeholder="Note to the requester (optional)" maxLength={1000} />
                  <div className="flex gap-2">
                    <button name="decision" value="approve" className={btnCta}>Approve</button>
                    <button name="decision" value="reject" className={btnGhost}>Reject</button>
                  </div>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
