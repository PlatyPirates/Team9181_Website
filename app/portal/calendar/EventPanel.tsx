"use client";
import { useEffect, useState, useTransition } from "react";
import { DateTime } from "luxon";
import {
  RSVP_LABEL,
  type CalendarContext, type CalendarEventRow, type EditScope, type RsvpResponse,
} from "@/lib/calendar/types";
import { describeRecurrence, parseRRule } from "@/lib/calendar/recurrence";
import { formatRange } from "@/lib/calendar/time";
import { addComment, deleteEvent, removeComment, setRsvp } from "./actions";
import type { FormTarget } from "./EventForm";
import { btnGhost, btnSmall, chip, errorBox, inputBase, inputCls, labelCls, muted } from "./styles";

interface Detail {
  event: CalendarEventRow;
  exception: { starts_at: string | null; ends_at: string | null; title: string | null; location: string | null; description: string | null; notes: string | null; kind: string } | null;
  groupIds: string[];
  rsvps: { user_id: string; response: RsvpResponse; set_by: string | null; updated_at: string }[];
  comments: { id: string; author_id: string; posted_by: string | null; body: string; created_at: string; edited_at: string | null; deleted_at: string | null }[];
  activity: { id: number; actor_id: string | null; subject_id: string | null; by_parent: boolean; action: string; detail: Record<string, unknown>; at: string }[];
  names: Record<string, string>;
  canEdit: boolean;
  canDelete: boolean;
}

const ACTION_LABEL: Record<string, string> = {
  created: "created this", requested: "asked to add this as a team event", approved: "approved this",
  rejected: "didn't approve this", edited: "edited this", deleted: "deleted this",
  cancelled_date: "removed one date", edited_date: "changed one date", rsvp: "answered the RSVP",
  commented: "commented", removed_comment: "removed a comment", edited_comment: "edited a comment",
};

const ago = (iso: string) => DateTime.fromISO(iso).toRelative() ?? "";

export default function EventPanel({
  ctx, eventId, occurrence, zone, onClose, onChanged, onEdit,
}: {
  ctx: CalendarContext;
  eventId: string;
  occurrence: string;
  zone: string;
  onClose: () => void;
  onChanged: (message?: string) => void;
  onEdit: (target: FormTarget) => void;
}) {
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actingFor, setActingFor] = useState<string>(ctx.me.id);
  const [comment, setComment] = useState("");
  const [askScope, setAskScope] = useState<null | "edit" | "delete">(null);
  const [scope, setScope] = useState<EditScope>("this");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const [version, setVersion] = useState(0);
  const reload = () => setVersion((n) => n + 1);

  useEffect(() => {
    let alive = true;
    fetch(`/api/calendar/events/${eventId}?occ=${encodeURIComponent(occurrence)}`, { cache: "no-store" })
      .then(async (r) => {
        const json = await r.json();
        if (!alive) return;
        if (!r.ok) setError(json.error || "Couldn't load this event.");
        else setD(json as Detail);
      })
      .catch(() => alive && setError("Couldn't load this event."));
    return () => {
      alive = false;
    };
  }, [eventId, occurrence, version]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const name = (id: string | null | undefined) => (id && d?.names[id]) || "Someone";
  const ev = d?.event;
  const recurring = Boolean(ev?.rrule);
  const dur = ev ? Date.parse(ev.ends_at) - Date.parse(ev.starts_at) : 0;
  const occStart = d?.exception?.starts_at ?? (recurring && occurrence ? occurrence : ev?.starts_at ?? "");
  const occEnd = d?.exception?.ends_at ?? (recurring && occurrence ? new Date(Date.parse(occurrence) + dur).toISOString() : ev?.ends_at ?? "");
  const title = d?.exception?.title ?? ev?.title ?? "";
  const location = d?.exception?.location ?? ev?.location;
  const description = d?.exception?.description ?? ev?.description;
  const notes = d?.exception?.notes ?? ev?.notes;
  const category = ctx.categories.find((c) => c.id === ev?.category_id);
  const groupNames = ctx.groups.filter((g) => d?.groupIds.includes(g.id)).map((g) => g.name);
  const lastChange = d?.activity.find((a) => ["created", "requested", "edited", "edited_date", "cancelled_date"].includes(a.action));
  const parentEdited = Boolean(lastChange?.by_parent && lastChange.actor_id === ev?.updated_by);
  const canRsvp = ev && !ev.is_private && ev.status === "approved";
  const actors = [{ id: ctx.me.id, label: "Me" }, ...ctx.students.map((s) => ({ id: s.id, label: `${s.full_name || s.username} (my student)` }))];
  const myAnswer = d?.rsvps.find((r) => r.user_id === actingFor)?.response ?? null;
  const moderator = ctx.perms.includes("moderate_comments");

  const run = (fn: () => Promise<{ error?: string; message?: string }>, after?: (msg?: string) => void) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      else {
        reload();
        after?.(res.message);
      }
    });
  };

  const startEdit = (sc: EditScope) => {
    if (!d || !ev) return;
    onEdit({ kind: "edit", event: ev, groupIds: d.groupIds, scope: sc, occurrence, occStart, occEnd });
  };

  const doDelete = (sc: EditScope) => {
    setError(null);
    startTransition(async () => {
      const res = await deleteEvent(eventId, sc, occurrence);
      if (res.error) setError(res.error);
      else {
        onChanged(res.message);
        onClose();
      }
    });
  };

  const counts = { yes: 0, maybe: 0, no: 0 } as Record<RsvpResponse, number>;
  for (const r of d?.rsvps ?? []) counts[r.response]++;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onClick={onClose}>
      <aside
        className="portal-surface h-full w-full max-w-[460px] overflow-y-auto border-l border-[color:var(--p-border-strong)] bg-[color:var(--p-surface)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-panel-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {category && <span className={`${chip} text-white`} style={{ background: category.color }}>{category.name}</span>}
            {ev?.custom_label && <span className={`${chip} border border-[color:var(--p-border-strong)] text-[color:var(--p-text)]`}>{ev.custom_label}</span>}
            {ev?.is_private && <span className={`${chip} bg-slate-500 text-white`}>Personal</span>}
            {ev?.status === "pending" && <span className={`${chip} bg-amber-600 text-white`}>Waiting for approval</span>}
            {ev?.status === "rejected" && <span className={`${chip} bg-stone-500 text-white`}>Not approved</span>}
            {d?.exception?.kind === "modified" && <span className={`${chip} border border-[color:var(--p-border-strong)] text-[color:var(--p-text-muted)]`}>Changed for this date</span>}
          </div>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-[color:var(--p-text-muted)] hover:text-[color:var(--p-text)]" aria-label="Close">×</button>
        </div>

        {error && <p className={`mt-3 ${errorBox}`} role="alert">{error}</p>}
        {!d && !error && <p className={`mt-6 ${muted}`}>Loading…</p>}

        {d && ev && (
          <>
            <h2 id="event-panel-title" className="mt-3 font-display text-2xl font-extrabold text-[color:var(--p-text)]">{title}</h2>
            <p className="mt-1 text-sm font-semibold text-[color:var(--p-text)]">{formatRange(occStart, occEnd, ev.all_day, zone)}</p>
            {recurring && <p className={`text-xs ${muted}`}>{describeRecurrence(parseRRule(ev.rrule), ev.starts_at)}</p>}
            {ev.status === "rejected" && ev.review_note && <p className={`mt-2 text-sm ${muted}`}>Approver&apos;s note: {ev.review_note}</p>}

            <dl className="mt-4 space-y-2 text-sm">
              {location && (
                <div>
                  <dt className={labelCls}>Where</dt>
                  <dd>
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`} target="_blank" rel="noreferrer" className="text-[color:var(--p-accent)] underline">{location}</a>
                  </dd>
                </div>
              )}
              {ev.link_url && (
                <div>
                  <dt className={labelCls}>Link</dt>
                  <dd className="break-all"><a href={ev.link_url} target="_blank" rel="noreferrer" className="text-[color:var(--p-accent)] underline">{ev.link_url}</a></dd>
                </div>
              )}
              {description && (
                <div>
                  <dt className={labelCls}>Details</dt>
                  <dd className="whitespace-pre-line text-[color:var(--p-text)]">{description}</dd>
                </div>
              )}
              {notes && (
                <div>
                  <dt className={labelCls}>Notes</dt>
                  <dd className="whitespace-pre-line text-[color:var(--p-text)]">{notes}</dd>
                </div>
              )}
              {ev.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {ev.tags.map((t) => <span key={t} className={`${chip} bg-[color:var(--p-hint-bg)] text-[color:var(--p-text)]`}>#{t}</span>)}
                </div>
              )}
              {groupNames.length > 0 && <p className={`text-xs ${muted}`}>Visible to: {groupNames.join(", ")}</p>}
              <p className={`text-xs ${muted}`}>
                Added by {name(ev.created_by)}{ev.on_behalf_of ? ` for ${name(ev.on_behalf_of)}` : ""}
                {ev.created_by && ev.on_behalf_of && ev.created_by !== ev.on_behalf_of ? " (by parent)" : ""}
                {ev.updated_by && ev.updated_at !== ev.created_at ? ` · last edited by ${name(ev.updated_by)} ${ago(ev.updated_at)}` : ""}
                {parentEdited ? " (by parent)" : ""}
              </p>
            </dl>

            {(d.canEdit || d.canDelete) && (
              <div className="mt-4 border-t border-[color:var(--p-border)] pt-3">
                {askScope ? (
                  <div className="grid gap-2 text-sm">
                    <p className="font-semibold">{askScope === "edit" ? "Edit which dates?" : "Delete which dates?"}</p>
                    {(["this", "following", "all"] as EditScope[]).map((sc) => (
                      <label key={sc} className="flex items-center gap-2">
                        <input type="radio" name="scope" checked={scope === sc} onChange={() => setScope(sc)} />
                        {sc === "this" ? "This date only" : sc === "following" ? "This and following dates" : "All dates in the series"}
                      </label>
                    ))}
                    <div className="flex gap-2">
                      <button type="button" className={btnSmall} disabled={pending} onClick={() => (askScope === "edit" ? startEdit(scope) : doDelete(scope))}>
                        {askScope === "edit" ? "Continue" : "Delete"}
                      </button>
                      <button type="button" className={`text-xs ${muted} underline`} onClick={() => setAskScope(null)}>Cancel</button>
                    </div>
                  </div>
                ) : confirmDelete ? (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span>Delete this event for everyone?</span>
                    <button type="button" className={btnSmall} disabled={pending} onClick={() => doDelete("all")}>Yes, delete</button>
                    <button type="button" className={`text-xs ${muted} underline`} onClick={() => setConfirmDelete(false)}>Cancel</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    {d.canEdit && (
                      <button type="button" className={btnGhost} onClick={() => (recurring ? setAskScope("edit") : startEdit("all"))}>Edit</button>
                    )}
                    {d.canDelete && (
                      <button type="button" className={btnGhost} onClick={() => (recurring ? setAskScope("delete") : setConfirmDelete(true))}>Delete</button>
                    )}
                  </div>
                )}
              </div>
            )}

            {ctx.students.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <label htmlFor="acting-for" className={muted}>RSVP and comment as</label>
                <select id="acting-for" className={`${inputBase} w-auto`} value={actingFor} onChange={(e) => setActingFor(e.target.value)}>
                  {actors.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </div>
            )}

            {canRsvp && (
              <section className="mt-4 border-t border-[color:var(--p-border)] pt-3">
                <h3 className={labelCls}>RSVP{recurring ? " for this date" : ""}</h3>
                <div className="flex flex-wrap gap-2">
                  {(["yes", "maybe", "no"] as RsvpResponse[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      disabled={pending}
                      aria-pressed={myAnswer === r}
                      onClick={() => run(() => setRsvp(eventId, occurrence, actingFor, myAnswer === r ? null : r))}
                      className={`rounded border px-3 py-1.5 text-sm ${myAnswer === r ? "border-[color:var(--p-cta-bg)] bg-[color:var(--p-cta-bg)] text-[color:var(--p-cta-text)]" : "border-[color:var(--p-border-strong)] text-[color:var(--p-text)] hover:bg-[color:var(--p-hint-bg)]"}`}
                    >
                      {RSVP_LABEL[r]} {counts[r] > 0 && <span className="opacity-70">· {counts[r]}</span>}
                    </button>
                  ))}
                </div>
                {d.rsvps.length > 0 && (
                  <details className="mt-2 text-sm">
                    <summary className={`cursor-pointer text-xs ${muted}`}>Who&apos;s coming</summary>
                    <ul className="mt-1 space-y-0.5">
                      {d.rsvps.map((r) => (
                        <li key={r.user_id}>
                          <strong>{name(r.user_id)}</strong>: {RSVP_LABEL[r.response]}
                          {r.set_by && r.set_by !== r.user_id && <span className={`text-xs ${muted}`}> (set by {name(r.set_by)}, parent)</span>}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </section>
            )}

            <section className="mt-4 border-t border-[color:var(--p-border)] pt-3">
              <h3 className={labelCls}>Comments</h3>
              {d.comments.length === 0 && <p className={`text-sm ${muted}`}>No comments yet.</p>}
              <ul className="space-y-3">
                {d.comments.map((c) => {
                  const mine = c.author_id === ctx.me.id || c.posted_by === ctx.me.id || ctx.students.some((s) => s.id === c.author_id);
                  return (
                    <li key={c.id} className="text-sm">
                      <div className={`text-xs ${muted}`}>
                        <strong className="text-[color:var(--p-text)]">{name(c.author_id)}</strong>
                        {c.posted_by && c.posted_by !== c.author_id && <> · posted by {name(c.posted_by)} (parent)</>}
                        {" · "}{ago(c.created_at)}{c.edited_at ? " · edited" : ""}
                      </div>
                      {c.deleted_at ? (
                        <p className={`italic ${muted}`}>Comment removed.</p>
                      ) : (
                        <p className="whitespace-pre-line text-[color:var(--p-text)]">{c.body}</p>
                      )}
                      {!c.deleted_at && (mine || moderator) && (
                        <button type="button" className={`text-xs ${muted} underline`} disabled={pending} onClick={() => run(() => removeComment(c.id))}>Remove</button>
                      )}
                    </li>
                  );
                })}
              </ul>
              <form
                className="mt-3 grid gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const body = comment;
                  run(() => addComment(eventId, actingFor, body), () => setComment(""));
                }}
              >
                <textarea className={`${inputCls} min-h-[60px]`} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" maxLength={4000} aria-label="Comment" />
                <div><button className={btnSmall} disabled={pending || !comment.trim()}>Post comment</button></div>
              </form>
            </section>

            {d.activity.length > 0 && (
              <details className="mt-4 border-t border-[color:var(--p-border)] pt-3 text-sm">
                <summary className={`cursor-pointer ${labelCls}`}>History</summary>
                <ul className="mt-2 space-y-1">
                  {d.activity.map((a) => (
                    <li key={a.id} className={muted}>
                      <strong className="text-[color:var(--p-text)]">{name(a.actor_id)}</strong> {ACTION_LABEL[a.action] ?? a.action}
                      {a.by_parent && <span className={`${chip} ml-1 bg-amber-600 text-white`}>by parent for {name(a.subject_id)}</span>}
                      <span className="text-xs"> · {ago(a.at)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </aside>
    </div>
  );
}
