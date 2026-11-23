"use client";
import { useCallback, useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import listPlugin from "@fullcalendar/list";
import luxonPlugin from "@fullcalendar/luxon3";
import type { EventClickArg, EventInput, EventSourceFuncArg } from "@fullcalendar/core";
import { DateTime } from "luxon";
import { CAL_TZ } from "@/lib/calendar/types";
import { formatRange } from "@/lib/calendar/time";
import CalendarEventBox from "@/components/CalendarEventBox";
import { DEFAULT_EVENT_STYLE, asEventStyle, type EventStyle } from "@/lib/calendar/types";

interface PublicEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string | null;
  description: string | null;
  category: string | null;
  color: string;
  linkUrl: string | null;
}

const wallDate = (iso: string) => DateTime.fromISO(iso, { zone: "utc" }).setZone(CAL_TZ).toFormat("yyyy-MM-dd");

export default function PublicCalendar() {
  const [open, setOpen] = useState<PublicEvent | null>(null);
  const [narrow, setNarrow] = useState(false);
  const [style, setStyle] = useState<EventStyle>(DEFAULT_EVENT_STYLE);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const set = () => setNarrow(mq.matches);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const events = useCallback((info: EventSourceFuncArg, ok: (e: EventInput[]) => void, fail: (e: Error) => void) => {
    const q = new URLSearchParams({ start: info.start.toISOString(), end: info.end.toISOString() });
    fetch(`/api/calendar/public/events?${q}`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || "Couldn't load events.");
        setStyle(asEventStyle(json.style) ?? DEFAULT_EVENT_STYLE);
        ok(
          (json.events as PublicEvent[]).map((e) => ({
            id: e.id,
            title: e.title,
            start: e.allDay ? wallDate(e.start) : e.start,
            end: e.allDay ? wallDate(e.end) : e.end,
            allDay: e.allDay,
            backgroundColor: e.color,
            borderColor: e.color,
            textColor: "#ffffff",
            extendedProps: e,
          })),
        );
      })
      .catch(fail);
  }, []);

  return (
    <>
      <div className={`cal-theme cal-site cal-ev-${style} relative left-1/2 w-[min(1652px,calc(100vw-48px))] -translate-x-1/2 rounded border border-maroon-deep/12 bg-cream p-3 shadow-card sm:p-4`}>
        <FullCalendar
          key={narrow ? "narrow" : "wide"}
          plugins={[dayGridPlugin, listPlugin, luxonPlugin]}
          initialView={narrow ? "listMonth" : "dayGridMonth"}
          timeZone={CAL_TZ}
          headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,listMonth" }}
          buttonText={{ today: "Today", month: "Month", list: "List" }}
          height="auto"
          dayMaxEvents={3}
          eventDisplay="block"
          eventContent={CalendarEventBox}
          events={events}
          eventClick={(arg: EventClickArg) => {
            arg.jsEvent.preventDefault();
            setOpen(arg.event.extendedProps as PublicEvent);
          }}
          eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
          noEventsContent="No public events this month. Check back soon!"
        />
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pub-ev-title"
            className="card-edge relative w-full max-w-lg rounded border border-maroon-deep/12 bg-cream p-6 shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="absolute top-3 right-4 text-2xl text-fog hover:text-maroon-deep" onClick={() => setOpen(null)} aria-label="Close">×</button>
            {open.category && (
              <span className="inline-block rounded-full px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-white" style={{ background: open.color }}>
                {open.category}
              </span>
            )}
            <h3 id="pub-ev-title" className="mt-2">{open.title}</h3>
            <p className="font-semibold">{formatRange(open.start, open.end, open.allDay)}</p>
            {open.location && (
              <p>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(open.location)}`} target="_blank" rel="noreferrer">
                  {open.location}
                </a>
              </p>
            )}
            {open.description && <p className="whitespace-pre-line">{open.description}</p>}
            {open.linkUrl && (
              <p className="mb-0">
                <a href={open.linkUrl} target="_blank" rel="noreferrer">More info</a>
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
