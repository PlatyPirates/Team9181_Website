// Build iCalendar (.ics) text. Each occurrence is written as its own VEVENT
// (already expanded, in UTC), which every calendar app reads the same way;
// no RRULE / VTIMEZONE edge cases to trip over.
import { DateTime } from "luxon";
import { CAL_TZ } from "./types";

export interface IcsItem {
  uid: string;
  title: string;
  start: string; // ISO UTC
  end: string;
  allDay: boolean;
  location?: string | null;
  description?: string | null;
  url?: string | null;
  categories?: string[];
  updatedAt?: string | null;
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Fold lines at 75 octets (RFC 5545 §3.1). */
function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  let curLen = 0;
  for (const ch of line) {
    const n = Buffer.byteLength(ch, "utf8");
    if (curLen + n > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = "";
      curLen = 0;
    }
    cur += ch;
    curLen += n;
  }
  out.push(cur);
  return out.join("\r\n ");
}

const utcStamp = (iso: string) => DateTime.fromISO(iso, { zone: "utc" }).toFormat("yyyyMMdd'T'HHmmss'Z'");
const centralDate = (iso: string) => DateTime.fromISO(iso, { zone: "utc" }).setZone(CAL_TZ).toFormat("yyyyMMdd");

export function buildIcs(name: string, items: IcsItem[], description?: string): string {
  const now = utcStamp(new Date().toISOString());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Platy Pirates FRC 9181//Team Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(name)}`,
    `X-WR-TIMEZONE:${CAL_TZ}`,
    ...(description ? [`X-WR-CALDESC:${esc(description)}`] : []),
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  for (const it of items) {
    lines.push("BEGIN:VEVENT", `UID:${it.uid}`, `DTSTAMP:${it.updatedAt ? utcStamp(it.updatedAt) : now}`);
    if (it.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${centralDate(it.start)}`, `DTEND;VALUE=DATE:${centralDate(it.end)}`);
    } else {
      lines.push(`DTSTART:${utcStamp(it.start)}`, `DTEND:${utcStamp(it.end)}`);
    }
    lines.push(`SUMMARY:${esc(it.title)}`);
    if (it.location) lines.push(`LOCATION:${esc(it.location)}`);
    const desc = [it.description, it.url].filter(Boolean).join("\n\n");
    if (desc) lines.push(`DESCRIPTION:${esc(desc)}`);
    if (it.url) lines.push(`URL:${it.url}`);
    if (it.categories?.length) lines.push(`CATEGORIES:${it.categories.map(esc).join(",")}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function icsResponse(body: string, filename: string, cacheSeconds = 0): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": cacheSeconds ? `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds}` : "private, no-store",
    },
  });
}
