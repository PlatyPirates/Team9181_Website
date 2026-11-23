"use client";
import type { CSSProperties } from "react";
import type { EventContentArg } from "@fullcalendar/core";

/**
 * Event box contents for FullCalendar: time on its own small line, then the
 * full (wrapping) title, plus the location in week/day views. The look
 * (tint / solid) comes from a cal-ev-<style> class on the wrapper; see
 * app/globals.css.
 */
export default function CalendarEventBox(arg: EventContentArg) {
  const e = arg.event.extendedProps as { color?: string; location?: string | null };
  const list = arg.view.type.startsWith("list");
  const showWhere = !list && arg.view.type !== "dayGridMonth" && e.location;
  return (
    <div className="cal-ev" style={{ "--ev": e.color ?? arg.event.backgroundColor } as CSSProperties}>
      {!list && !arg.event.allDay && arg.timeText && <span className="cal-ev-time">{arg.timeText}</span>}
      <span className="cal-ev-title">{arg.event.title}</span>
      {showWhere && <span className="cal-ev-where">{e.location}</span>}
      {list && e.location && <span className="cal-ev-where"> · {e.location}</span>}
    </div>
  );
}
