"use client";
import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin, { type DateClickArg } from "@fullcalendar/interaction";
import luxonPlugin from "@fullcalendar/luxon3";
import type { EventClickArg, EventInput as FcEvent, EventSourceFuncArg } from "@fullcalendar/core";
import CalendarEventBox from "@/components/CalendarEventBox";
import { DateTime } from "luxon";
import { CAL_SIZES, CAL_TZ, passesGroupFilter, type CalSize, type CalendarContext, type GridEvent } from "@/lib/calendar/types";
import { savePrefs } from "./actions";
import EventPanel from "./EventPanel";
import EventForm, { type FormTarget } from "./EventForm";
import { btnCta, chip, hintBox, muted } from "./styles";

const browserZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || CAL_TZ;
  } catch {
    return CAL_TZ;
  }
};

export default function CalendarClient({ ctx }: { ctx: CalendarContext }) {
  const calRef = useRef<FullCalendar>(null);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(ctx.hiddenGroups));
  const [localTz, setLocalTz] = useState(ctx.showLocalTz);
  const [size, setSize] = useState<CalSize>(ctx.calSize);
  const [panel, setPanel] = useState<{ eventId: string; occurrence: string } | null>(null);
  const [form, setForm] = useState<FormTarget | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const zone = useMemo(() => browserZone(), []);
  const differentZone = zone !== CAL_TZ;
  const displayZone = localTz && differentZone ? zone : CAL_TZ;
  const zoneLabel = displayZone === CAL_TZ ? "Central time (CT)" : `your time zone (${DateTime.now().setZone(zone).toFormat("ZZZZ")})`;

  const myGroups = useMemo(() => new Set(ctx.myGroupIds), [ctx.myGroupIds]);
  const viewerIds = useMemo(() => new Set([ctx.me.id, ...ctx.students.map((s) => s.id)]), [ctx.me.id, ctx.students]);
  const filterGroups = ctx.groups.filter((g) => myGroups.has(g.id));
  const canCreate =
    ctx.perms.includes("create_personal") || ctx.perms.includes("request_team_event") ||
    ctx.perms.includes("create_team_event") || ctx.perms.includes("create_for_student");

  const toFc = useCallback((e: GridEvent): FcEvent => {
    const wallDate = (iso: string) => DateTime.fromISO(iso, { zone: "utc" }).setZone(CAL_TZ).toFormat("yyyy-MM-dd");
    const classNames = [e.status === "pending" ? "cal-pending" : "", e.isPrivate ? "cal-private" : ""].filter(Boolean);
    return {
      id: `${e.eventId}|${e.occurrence}`,
      title: `${e.status === "pending" ? "Pending: " : ""}${e.title}`,
      start: e.allDay ? wallDate(e.start) : e.start,
      end: e.allDay ? wallDate(e.end) : e.end,
      allDay: e.allDay,
      backgroundColor: e.color,
      borderColor: e.color,
      textColor: "#ffffff",
      classNames,
      extendedProps: e,
    };
  }, []);

  // Refetches whenever the filter changes (new function = new source).
  const events = useCallback(
    (info: EventSourceFuncArg, ok: (ev: FcEvent[]) => void, fail: (err: Error) => void) => {
      const q = new URLSearchParams({ start: info.start.toISOString(), end: info.end.toISOString() });
      fetch(`/api/calendar/events?${q}`, { cache: "no-store" })
        .then(async (r) => {
          const json = await r.json();
          if (!r.ok) throw new Error(json.error || "Couldn't load events.");
          setLoadError(null);
          const list = (json.events as GridEvent[]).filter((e) =>
            passesGroupFilter(e.groupIds, myGroups, hidden, viewerIds.has(e.createdBy ?? "") || viewerIds.has(e.onBehalfOf ?? "")),
          );
          ok(list.map(toFc));
        })
        .catch((err: Error) => {
          setLoadError(err.message);
          fail(err);
        });
    },
    [hidden, myGroups, viewerIds, toFc],
  );

  const refresh = () => calRef.current?.getApi().refetchEvents();

  const toggleGroup = (id: string) => {
    const next = new Set(hidden);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setHidden(next);
    startTransition(() => void savePrefs({ hiddenGroups: [...next] }));
  };

  const toggleZone = () => {
    const next = !localTz;
    setLocalTz(next);
    startTransition(() => void savePrefs({ showLocalTz: next }));
  };

  const changeSize = (next: CalSize) => {
    setSize(next);
    // Let FullCalendar re-measure once the new row/slot heights apply.
    requestAnimationFrame(() => calRef.current?.getApi().updateSize());
    startTransition(() => void savePrefs({ calSize: next }));
  };

  const onDateClick = (arg: DateClickArg) => {
    if (!canCreate) return;
    // Month view gives a day; the time grids give a time. Forms are in Central.
    if (arg.allDay) {
      setForm({ kind: "new", date: arg.dateStr.slice(0, 10), time: null });
      return;
    }
    const c = DateTime.fromISO(arg.dateStr, { setZone: true }).setZone(CAL_TZ);
    setForm({ kind: "new", date: c.toFormat("yyyy-MM-dd"), time: c.toFormat("HH:mm") });
  };

  const onEventClick = (arg: EventClickArg) => {
    const e = arg.event.extendedProps as GridEvent;
    setPanel({ eventId: e.eventId, occurrence: e.occurrence });
  };

  const done = (message?: string) => {
    setForm(null);
    if (message) {
      setToast(message);
      setTimeout(() => setToast(null), 5000);
    }
    refresh();
  };

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Show events for">
          <span className={`${muted} text-sm`}>Show:</span>
          {filterGroups.map((g) => {
            const on = !hidden.has(g.id);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => toggleGroup(g.id)}
                aria-pressed={on}
                className={`${chip} border ${
                  on
                    ? "border-[color:var(--p-cta-bg)] bg-[color:var(--p-cta-bg)] text-[color:var(--p-cta-text)]"
                    : "border-[color:var(--p-border-strong)] text-[color:var(--p-text-muted)] line-through"
                }`}
              >
                {g.name}
              </button>
            );
          })}
        </div>
        {canCreate && (
          <button type="button" className={btnCta} onClick={() => setForm({ kind: "new", date: DateTime.now().setZone(CAL_TZ).toFormat("yyyy-MM-dd"), time: null })}>
            + New event
          </button>
        )}
      </div>

      <div className={`mt-2 flex flex-wrap items-center gap-3 text-xs ${muted}`}>
        <span className="flex items-center gap-1" role="group" aria-label="Calendar size">
          Size:
          {CAL_SIZES.map((sz) => (
            <button
              key={sz.value}
              type="button"
              onClick={() => changeSize(sz.value)}
              aria-pressed={size === sz.value}
              className={`rounded px-1.5 py-0.5 ${
                size === sz.value
                  ? "bg-[color:var(--p-cta-bg)] text-[color:var(--p-cta-text)]"
                  : "underline hover:text-[color:var(--p-accent)]"
              }`}
            >
              {sz.label}
            </button>
          ))}
        </span>
        <span>All times shown in {zoneLabel}.</span>
        {differentZone && (
          <button type="button" onClick={toggleZone} className="underline hover:text-[color:var(--p-accent)]">
            {localTz ? "Show Central time instead" : "Show in my time zone"}
          </button>
        )}
      </div>

      {toast && <p className={`mt-3 ${hintBox}`} role="status">{toast}</p>}
      {loadError && <p className="mt-3 text-sm text-[color:var(--p-error-text)]">{loadError}</p>}

      <div className={`cal-theme cal-ev-${ctx.eventStyle} cal-size-${size} portal-surface mt-4 rounded-xl border border-[color:var(--p-border)] bg-[color:var(--p-surface)] p-3 sm:p-4`}>
        <FullCalendar
          ref={calRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin, luxonPlugin]}
          initialView="dayGridMonth"
          timeZone={displayZone}
          headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay,listMonth" }}
          buttonText={{ today: "Today", month: "Month", week: "Week", day: "Day", list: "Agenda" }}
          height="auto"
          dayMaxEvents={5}
          eventDisplay="block"
          eventContent={CalendarEventBox}
          nowIndicator
          events={events}
          eventClick={onEventClick}
          dateClick={onDateClick}
          eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
          slotMinTime="06:00:00"
          scrollTime="15:00:00"
        />
      </div>

      {panel && (
        <EventPanel
          key={`${panel.eventId}|${panel.occurrence}`}
          ctx={ctx}
          eventId={panel.eventId}
          occurrence={panel.occurrence}
          zone={displayZone}
          onClose={() => setPanel(null)}
          onChanged={(msg) => {
            if (msg) {
              setToast(msg);
              setTimeout(() => setToast(null), 5000);
            }
            refresh();
          }}
          onEdit={(target) => {
            setPanel(null);
            setForm(target);
          }}
        />
      )}
      {form && <EventForm ctx={ctx} target={form} onClose={() => setForm(null)} onDone={done} />}
    </div>
  );
}
