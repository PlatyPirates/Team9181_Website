"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { DateTime } from "luxon";
import {
  CAL_TZ, EMPTY_RECURRENCE,
  type CalendarCategory, type CalendarContext, type CalendarEventRow, type EditScope, type EventInput, type Recurrence,
} from "@/lib/calendar/types";
import { describeRecurrence, parseRRule } from "@/lib/calendar/recurrence";
import { wallToUtc } from "@/lib/calendar/time";
import { saveEvent } from "./actions";
import { createCategory } from "./admin/actions";
import { btnCta, btnGhost, chip, errorBox, hintBox, inputBase, inputCls, labelCls, muted } from "./styles";

export type FormTarget =
  | { kind: "new"; date: string; time: string | null }
  | {
      kind: "edit";
      event: CalendarEventRow;
      groupIds: string[];
      scope: EditScope;
      occurrence: string;
      occStart: string;
      occEnd: string;
    };

const DAYS: [string, string][] = [["SU", "S"], ["MO", "M"], ["TU", "T"], ["WE", "W"], ["TH", "T"], ["FR", "F"], ["SA", "S"]];

const wall = (iso: string) => {
  const d = DateTime.fromISO(iso, { zone: "utc" }).setZone(CAL_TZ);
  return { date: d.toFormat("yyyy-MM-dd"), time: d.toFormat("HH:mm") };
};

function initial(ctx: CalendarContext, target: FormTarget): EventInput {
  if (target.kind === "new") {
    const time = target.time ?? "18:00";
    const end = DateTime.fromISO(`${target.date}T${time}`).plus({ hours: target.time ? 1 : 2 });
    const canTeam = ctx.perms.includes("create_team_event") || ctx.perms.includes("request_team_event");
    const allMembers = ctx.groups.find((g) => g.kind === "all_members");
    return {
      title: "", description: "", notes: "", customLabel: "", location: "", linkUrl: "",
      allDay: false,
      startDate: target.date, startTime: time,
      endDate: end.toFormat("yyyy-MM-dd"), endTime: end.toFormat("HH:mm"),
      categoryId: null, tags: [],
      mode: canTeam && ctx.perms.includes("create_team_event") ? "team" : "personal",
      forStudent: null,
      groupIds: allMembers ? [allMembers.id] : [],
      makePublic: false,
      recurrence: { ...EMPTY_RECURRENCE },
    };
  }
  const ev = target.event;
  const useOcc = target.scope !== "all" && ev.rrule;
  const s = wall(useOcc ? target.occStart : ev.starts_at);
  let e = wall(useOcc ? target.occEnd : ev.ends_at);
  if (ev.all_day) {
    // stored end is exclusive midnight; the form shows the last day
    const last = DateTime.fromISO(useOcc ? target.occEnd : ev.ends_at, { zone: "utc" }).setZone(CAL_TZ).minus({ days: 1 });
    e = { date: last.toFormat("yyyy-MM-dd"), time: "00:00" };
  }
  const pub = ctx.groups.find((g) => g.kind === "public");
  return {
    id: ev.id,
    scope: target.scope,
    occurrence: target.occurrence,
    title: ev.title,
    description: ev.description ?? "",
    notes: ev.notes ?? "",
    customLabel: ev.custom_label ?? "",
    location: ev.location ?? "",
    linkUrl: ev.link_url ?? "",
    allDay: ev.all_day,
    startDate: s.date, startTime: s.time, endDate: e.date, endTime: e.time,
    categoryId: ev.category_id,
    tags: ev.tags ?? [],
    mode: ev.is_private ? "personal" : "team",
    forStudent: ev.on_behalf_of,
    groupIds: target.groupIds.filter((g) => g !== pub?.id),
    makePublic: Boolean(pub && target.groupIds.includes(pub.id)),
    recurrence: parseRRule(ev.rrule),
  };
}

export default function EventForm({
  ctx, target, onClose, onDone,
}: { ctx: CalendarContext; target: FormTarget; onClose: () => void; onDone: (message?: string) => void }) {
  const [v, setV] = useState<EventInput>(() => initial(ctx, target));
  const [tagDraft, setTagDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [cats, setCats] = useState<CalendarCategory[]>(ctx.categories);
  const [newCat, setNewCat] = useState<{ name: string; color: string } | null>(null);

  const has = (p: (typeof ctx.perms)[number]) => ctx.perms.includes(p);
  const isEdit = target.kind === "edit";
  const onlyThisDate = isEdit && target.scope === "this" && Boolean(target.event.rrule);
  const canTeam = has("create_team_event") || has("request_team_event") || (v.forStudent !== null && has("create_for_student"));
  const canPersonal = has("create_personal") || (v.forStudent !== null && has("create_for_student"));
  const willNeedApproval = v.mode === "team" && (!has("create_team_event") || v.forStudent !== null)
    && !(isEdit && target.event.status === "approved" && !target.event.is_private);

  const memberGroups = ctx.groups.filter((g) => g.kind === "members");
  const allMembers = ctx.groups.find((g) => g.kind === "all_members");
  const allOn = Boolean(allMembers && v.groupIds.includes(allMembers.id));
  const presetMemberIds = new Set(memberGroups.filter((g) => g.is_preset).map((g) => g.id));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = <K extends keyof EventInput>(k: K, val: EventInput[K]) => setV((p) => ({ ...p, [k]: val }));
  const setRec = <K extends keyof Recurrence>(k: K, val: Recurrence[K]) => setV((p) => ({ ...p, recurrence: { ...p.recurrence, [k]: val } }));
  const toggleGroup = (id: string) =>
    setV((p) => ({ ...p, groupIds: p.groupIds.includes(id) ? p.groupIds.filter((g) => g !== id) : [...p.groupIds, id] }));

  const startIso = useMemo(() => {
    try {
      return wallToUtc(v.startDate, v.allDay ? "00:00" : v.startTime);
    } catch {
      return null;
    }
  }, [v.startDate, v.startTime, v.allDay]);

  const addTag = (raw: string) => {
    const parts = raw.split(",").map((t) => t.trim().replace(/^#/, "").toLowerCase()).filter(Boolean);
    if (parts.length) setV((p) => ({ ...p, tags: [...new Set([...p.tags, ...parts])].slice(0, 15) }));
    setTagDraft("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload = { ...v, tags: tagDraft.trim() ? [...v.tags, ...tagDraft.split(",").map((t) => t.trim()).filter(Boolean)] : v.tags };
    startTransition(async () => {
      const res = await saveEvent(payload);
      if (res.error) setError(res.error);
      else onDone(res.message);
    });
  };

  const makeCategory = () => {
    if (!newCat?.name.trim()) return;
    startTransition(async () => {
      const res = await createCategory(newCat.name, newCat.color);
      if (res.error || !res.category) {
        setError(res.error ?? "Couldn't add the category.");
        return;
      }
      setCats((c) => [...c, res.category!]);
      set("categoryId", res.category.id);
      setNewCat(null);
    });
  };

  const submitLabel = willNeedApproval ? "Send for approval" : isEdit ? "Save changes" : v.mode === "team" ? "Add to team calendar" : "Add personal event";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8" role="dialog" aria-modal="true" aria-labelledby="event-form-title">
      <form onSubmit={submit} className="portal-surface w-full max-w-2xl rounded-xl border border-[color:var(--p-border-strong)] bg-[color:var(--p-surface)] p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id="event-form-title" className="font-display text-2xl font-extrabold text-[color:var(--p-text)]">
            {isEdit ? (onlyThisDate ? "Edit this date" : target.scope === "following" ? "Edit this and following dates" : "Edit event") : "New event"}
          </h2>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-[color:var(--p-text-muted)] hover:text-[color:var(--p-text)]" aria-label="Close">×</button>
        </div>

        {error && <p className={`mt-3 ${errorBox}`} role="alert">{error}</p>}

        <div className="mt-4 grid gap-4">
          <div>
            <label className={labelCls} htmlFor="ev-title">Title</label>
            <input id="ev-title" className={inputCls} value={v.title} onChange={(e) => set("title", e.target.value)} maxLength={200} required autoFocus />
          </div>

          {/* Who it's for + who sees it */}
          {!onlyThisDate && (
            <fieldset className="grid gap-3 rounded border border-[color:var(--p-border)] p-3">
              <legend className={`${labelCls} px-1`}>Who sees it</legend>
              {ctx.students.length > 0 && has("create_for_student") && !isEdit && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <label htmlFor="ev-for" className={muted}>This event is for</label>
                  <select id="ev-for" className={`${inputBase} w-auto`} value={v.forStudent ?? ""} onChange={(e) => set("forStudent", e.target.value || null)}>
                    <option value="">Me</option>
                    {ctx.students.map((s) => (
                      <option key={s.id} value={s.id}>{s.full_name || s.username} (my student)</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input type="radio" name="mode" checked={v.mode === "personal"} disabled={!canPersonal} onChange={() => set("mode", "personal")} />
                  Personal {v.forStudent ? "(only you and your student)" : ctx.students.length ? "(only you)" : "(only you and your parents)"}
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="mode" checked={v.mode === "team"} disabled={!canTeam} onChange={() => set("mode", "team")} />
                  Team event
                </label>
              </div>
              {v.mode === "team" && (
                <div className="grid gap-2">
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                    {allMembers && (
                      <label className="flex items-center gap-2 font-semibold">
                        <input type="checkbox" checked={allOn} onChange={() => toggleGroup(allMembers.id)} />
                        {allMembers.name}
                      </label>
                    )}
                    {memberGroups.map((g) => {
                      const locked = allOn && presetMemberIds.has(g.id);
                      return (
                        <label key={g.id} className={`flex items-center gap-2 ${locked ? "opacity-50" : ""}`}>
                          <input type="checkbox" checked={locked || v.groupIds.includes(g.id)} disabled={locked} onChange={() => toggleGroup(g.id)} />
                          {g.name}
                        </label>
                      );
                    })}
                    {has("mark_public") && (
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={v.makePublic} onChange={(e) => set("makePublic", e.target.checked)} />
                        Public Calendar (website)
                      </label>
                    )}
                  </div>
                  {willNeedApproval && (
                    <p className={`${hintBox} text-xs`}>This goes to an approver first. It shows on the team calendar once they say yes.</p>
                  )}
                </div>
              )}
            </fieldset>
          )}

          {/* When */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="ev-sd">Starts</label>
              <div className="flex gap-2">
                <input id="ev-sd" type="date" className={inputCls} value={v.startDate} onChange={(e) => set("startDate", e.target.value)} required />
                {!v.allDay && <input type="time" aria-label="Start time" className={`${inputBase} w-32`} value={v.startTime} onChange={(e) => set("startTime", e.target.value)} required />}
              </div>
            </div>
            <div>
              <label className={labelCls} htmlFor="ev-ed">Ends</label>
              <div className="flex gap-2">
                <input id="ev-ed" type="date" className={inputCls} value={v.endDate} onChange={(e) => set("endDate", e.target.value)} required />
                {!v.allDay && <input type="time" aria-label="End time" className={`${inputBase} w-32`} value={v.endTime} onChange={(e) => set("endTime", e.target.value)} required />}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={v.allDay} onChange={(e) => set("allDay", e.target.checked)} /> All day
            </label>
            <span className={`text-xs ${muted}`}>Times are Central (CT).</span>
          </div>

          {/* Repeat */}
          {!onlyThisDate && (
            <fieldset className="grid gap-2 rounded border border-[color:var(--p-border)] p-3">
              <legend className={`${labelCls} px-1`}>Repeat</legend>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <select aria-label="Repeat" className={`${inputBase} w-auto`} value={v.recurrence.freq} onChange={(e) => setRec("freq", e.target.value as Recurrence["freq"])}>
                  <option value="none">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                {v.recurrence.freq !== "none" && (
                  <>
                    <span className={muted}>every</span>
                    <input type="number" min={1} max={99} aria-label="Interval" className={`${inputBase} w-16`} value={v.recurrence.interval} onChange={(e) => setRec("interval", Number(e.target.value) || 1)} />
                    <span className={muted}>{v.recurrence.freq === "daily" ? "day(s)" : v.recurrence.freq === "weekly" ? "week(s)" : "month(s)"}</span>
                  </>
                )}
              </div>
              {v.recurrence.freq === "weekly" && (
                <div className="flex gap-1" role="group" aria-label="Days of the week">
                  {DAYS.map(([code, letter]) => {
                    const on = v.recurrence.byDay.includes(code);
                    return (
                      <button
                        key={code}
                        type="button"
                        aria-pressed={on}
                        aria-label={code}
                        onClick={() => setRec("byDay", on ? v.recurrence.byDay.filter((d) => d !== code) : [...v.recurrence.byDay, code])}
                        className={`size-8 rounded-full border text-xs font-bold ${on ? "border-[color:var(--p-cta-bg)] bg-[color:var(--p-cta-bg)] text-[color:var(--p-cta-text)]" : "border-[color:var(--p-border-strong)] text-[color:var(--p-text)]"}`}
                      >
                        {letter}
                      </button>
                    );
                  })}
                </div>
              )}
              {v.recurrence.freq === "monthly" && (
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2"><input type="radio" checked={v.recurrence.monthlyMode === "date"} onChange={() => setRec("monthlyMode", "date")} /> Same date</label>
                  <label className="flex items-center gap-2"><input type="radio" checked={v.recurrence.monthlyMode === "nth"} onChange={() => setRec("monthlyMode", "nth")} /> Same weekday (e.g. 2nd Tuesday)</label>
                </div>
              )}
              {v.recurrence.freq !== "none" && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className={muted}>Ends</span>
                  <select aria-label="Ends" className={`${inputBase} w-auto`} value={v.recurrence.endType} onChange={(e) => setRec("endType", e.target.value as Recurrence["endType"])}>
                    <option value="never">Never</option>
                    <option value="until">On a date</option>
                    <option value="count">After a number of times</option>
                  </select>
                  {v.recurrence.endType === "until" && (
                    <input type="date" aria-label="Last date" className={`${inputBase} w-auto`} value={v.recurrence.until} onChange={(e) => setRec("until", e.target.value)} required />
                  )}
                  {v.recurrence.endType === "count" && (
                    <input type="number" min={1} max={500} aria-label="Number of times" className={`${inputBase} w-20`} value={v.recurrence.count} onChange={(e) => setRec("count", Number(e.target.value) || 1)} />
                  )}
                </div>
              )}
              {v.recurrence.freq !== "none" && <p className={`text-xs ${muted}`}>{describeRecurrence(v.recurrence, startIso)}</p>}
            </fieldset>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="ev-loc">Location</label>
              <input id="ev-loc" className={inputCls} value={v.location} onChange={(e) => set("location", e.target.value)} maxLength={300} placeholder="Shop, school, address…" />
            </div>
            {!onlyThisDate && (
              <div>
                <label className={labelCls} htmlFor="ev-link">Link</label>
                <input id="ev-link" className={inputCls} value={v.linkUrl} onChange={(e) => set("linkUrl", e.target.value)} placeholder="https://…" inputMode="url" />
              </div>
            )}
          </div>

          {!onlyThisDate && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="ev-cat">Category</label>
                <div className="flex items-center gap-2">
                  <span className="size-4 shrink-0 rounded-full border border-[color:var(--p-border)]" style={{ background: cats.find((c) => c.id === v.categoryId)?.color ?? "transparent" }} aria-hidden />
                  <select
                    id="ev-cat"
                    className={inputCls}
                    value={v.categoryId ?? ""}
                    onChange={(e) => {
                      if (e.target.value === "__new") setNewCat({ name: "", color: "#0f766e" });
                      else set("categoryId", e.target.value || null);
                    }}
                  >
                    <option value="">No category</option>
                    {cats.filter((c) => !c.archived || c.id === v.categoryId).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                    {has("manage_categories") && <option value="__new">+ New category…</option>}
                  </select>
                </div>
                {newCat && (
                  <div className="mt-2 flex items-center gap-2">
                    <input className={inputCls} placeholder="Category name" value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} maxLength={60} />
                    <input type="color" aria-label="Category color" value={newCat.color} onChange={(e) => setNewCat({ ...newCat, color: e.target.value })} className="h-8 w-10 rounded border border-[color:var(--p-border)]" />
                    <button type="button" className={btnGhost} onClick={makeCategory} disabled={pending}>Add</button>
                    <button type="button" className={`text-xs ${muted} underline`} onClick={() => setNewCat(null)}>Cancel</button>
                  </div>
                )}
              </div>
              <div>
                <label className={labelCls} htmlFor="ev-label">Custom label</label>
                <input id="ev-label" className={inputCls} value={v.customLabel} onChange={(e) => set("customLabel", e.target.value)} maxLength={60} placeholder="e.g. Field trip (no category needed)" />
              </div>
            </div>
          )}

          {!onlyThisDate && (
            <div>
              <label className={labelCls} htmlFor="ev-tags">Tags</label>
              <div className="flex flex-wrap items-center gap-1.5 rounded border border-[color:var(--p-border)] bg-[color:var(--p-input-bg)] px-2 py-1">
                {v.tags.map((t) => (
                  <span key={t} className={`${chip} bg-[color:var(--p-hint-bg)] text-[color:var(--p-text)]`}>
                    #{t}
                    <button type="button" aria-label={`Remove ${t}`} onClick={() => set("tags", v.tags.filter((x) => x !== t))}>×</button>
                  </span>
                ))}
                <input
                  id="ev-tags"
                  className="min-w-[8rem] flex-1 bg-transparent py-1 text-sm text-[color:var(--p-text)] outline-none"
                  value={tagDraft}
                  onChange={(e) => (e.target.value.endsWith(",") ? addTag(e.target.value) : setTagDraft(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && tagDraft.trim()) {
                      e.preventDefault();
                      addTag(tagDraft);
                    }
                  }}
                  onBlur={() => tagDraft.trim() && addTag(tagDraft)}
                  placeholder={v.tags.length ? "" : "Type and press Enter (e.g. drive-team, cad)"}
                />
              </div>
            </div>
          )}

          <div>
            <label className={labelCls} htmlFor="ev-desc">Description</label>
            <textarea id="ev-desc" className={`${inputCls} min-h-[80px] resize-y`} value={v.description} onChange={(e) => set("description", e.target.value)} maxLength={5000} />
          </div>
          <div>
            <label className={labelCls} htmlFor="ev-notes">Notes</label>
            <textarea id="ev-notes" className={`${inputCls} min-h-[60px] resize-y`} value={v.notes} onChange={(e) => set("notes", e.target.value)} maxLength={5000} placeholder="Anything else: what to bring, rides, reminders. Members only; never on the public site." />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" className={btnGhost} onClick={onClose}>Cancel</button>
          <button className={btnCta} disabled={pending}>{pending ? "Saving…" : submitLabel}</button>
        </div>
      </form>
    </div>
  );
}
