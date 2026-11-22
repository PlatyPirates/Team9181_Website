// Turn one calendar_events row (+ its exceptions) into Google Calendar event
// bodies. Pure functions, no I/O, so they're easy to test.
//
// - A one-off event becomes one Google event.
// - A series becomes one recurring Google event (RRULE + EXDATE). Each date
//   that was edited on its own is EXDATE'd from the series and pushed as a
//   separate one-off copy, which avoids Google's instance-id rules entirely.
// - Google event ids are our UUID without dashes (allowed characters are
//   0-9 and a-v), so a retried push can never create a duplicate.
import { createHash } from "node:crypto";
import { DateTime } from "luxon";
import { CAL_TZ, type CalendarEventRow, type ExceptionRow } from "./types";

export interface GoogleEventBody {
  id: string;
  status: "confirmed";
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  recurrence?: string[];
  visibility?: "private" | "default";
  reminders: { useDefault: true };
  extendedProperties: { private: Record<string, string> };
}

export interface GooglePayload {
  main: GoogleEventBody;
  extras: GoogleEventBody[];
  hash: string;
}

export const googleIdFor = (eventId: string) => eventId.replace(/-/g, "").toLowerCase();

const central = (iso: string) => DateTime.fromISO(iso, { zone: "utc" }).setZone(CAL_TZ);

function when(iso: string, allDay: boolean) {
  if (allDay) return { date: central(iso).toFormat("yyyy-MM-dd") };
  return { dateTime: central(iso).toISO({ suppressMilliseconds: true })!, timeZone: CAL_TZ };
}

/** Our stored RRULE (floating Central UNTIL) → Google's (UTC UNTIL, or a date for all-day). */
export function googleRRule(rrule: string, allDay: boolean): string {
  const parts = rrule.split(";").map((p) => {
    if (!p.startsWith("UNTIL=")) return p;
    const v = p.slice(6);
    if (v.endsWith("Z")) return allDay ? `UNTIL=${v.slice(0, 8)}` : p;
    if (allDay || v.length === 8) return `UNTIL=${v.slice(0, 8)}`;
    const dt = DateTime.fromFormat(v, "yyyyMMdd'T'HHmmss", { zone: CAL_TZ });
    return dt.isValid ? `UNTIL=${dt.toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'")}` : p;
  });
  return `RRULE:${parts.join(";")}`;
}

function exdate(originalStart: string, allDay: boolean): string {
  const c = central(new Date(originalStart).toISOString());
  return allDay ? `EXDATE;VALUE=DATE:${c.toFormat("yyyyMMdd")}` : `EXDATE;TZID=${CAL_TZ}:${c.toFormat("yyyyMMdd'T'HHmmss")}`;
}

export interface DescribeOpts {
  category: string | null;
  portalUrl: string;
}

function describe(row: CalendarEventRow, parts: { description: string | null; notes: string | null }, o: DescribeOpts): string {
  const lines: string[] = [];
  if (parts.description) lines.push(parts.description);
  if (parts.notes) lines.push(`Notes: ${parts.notes}`);
  const meta = [o.category, ...(row.tags ?? []).map((t) => `#${t}`)].filter(Boolean).join(" · ");
  if (meta) lines.push(meta);
  if (row.link_url) lines.push(row.link_url);
  lines.push(`View in the team portal: ${o.portalUrl}`);
  return lines.join("\n\n").slice(0, 8000);
}

export function buildGooglePayload(row: CalendarEventRow, exceptions: ExceptionRow[], o: DescribeOpts): GooglePayload {
  const id = googleIdFor(row.id);
  const base = (over: Partial<GoogleEventBody>): GoogleEventBody => ({
    id,
    status: "confirmed",
    summary: row.title,
    description: describe(row, { description: row.description, notes: row.notes }, o),
    ...(row.location ? { location: row.location } : {}),
    start: when(row.starts_at, row.all_day),
    end: when(row.ends_at, row.all_day),
    visibility: row.is_private ? "private" : "default",
    reminders: { useDefault: true },
    extendedProperties: { private: { platyEventId: row.id } },
    ...over,
  });

  if (!row.rrule) {
    const main = base({});
    return { main, extras: [], hash: hashOf(main, []) };
  }

  const sorted = [...exceptions].sort((a, b) => Date.parse(a.original_start) - Date.parse(b.original_start));
  const recurrence = [googleRRule(row.rrule, row.all_day), ...sorted.map((x) => exdate(x.original_start, row.all_day))];
  const main = base({ recurrence });

  const durMs = Date.parse(row.ends_at) - Date.parse(row.starts_at);
  const extras = sorted
    .filter((x) => x.kind === "modified")
    .map((x) => {
      const orig = new Date(x.original_start).toISOString();
      const start = x.starts_at ? new Date(x.starts_at).toISOString() : orig;
      const end = x.ends_at ? new Date(x.ends_at).toISOString() : new Date(Date.parse(start) + durMs).toISOString();
      const stamp = DateTime.fromISO(orig, { zone: "utc" }).toFormat("yyyyMMddHHmmss");
      return base({
        id: `${id}0${stamp}`,
        summary: x.title || row.title,
        description: describe(
          row,
          { description: x.description ?? row.description, notes: x.notes ?? row.notes },
          o,
        ),
        ...(x.location ?? row.location ? { location: (x.location ?? row.location) as string } : {}),
        start: when(start, row.all_day),
        end: when(end, row.all_day),
        extendedProperties: { private: { platyEventId: row.id, platyOccurrence: orig } },
      });
    });
  return { main, extras, hash: hashOf(main, extras) };
}

function hashOf(main: GoogleEventBody, extras: GoogleEventBody[]): string {
  return createHash("sha256").update(JSON.stringify({ v: 1, main, extras })).digest("hex").slice(0, 32);
}
