// Recurrence: build RRULE strings from the form, expand series into
// occurrences, and describe a rule in plain English.
//
// Rules repeat in America/Chicago *wall-clock* time, so a 6 PM meeting stays
// at 6 PM across daylight saving. rrule.js works in UTC, so we expand in
// "fake UTC" (Central wall components written as if they were UTC) and
// convert each result back to a real instant with Luxon.
import { DateTime } from "luxon";
import { RRule, type Options } from "rrule";
import { CAL_TZ, EMPTY_RECURRENCE, type ExceptionRow, type Occurrence, type Recurrence } from "./types";

const DAY_CODES = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;
const DAY_NAMES: Record<string, string> = {
  MO: "Mon", TU: "Tue", WE: "Wed", TH: "Thu", FR: "Fri", SA: "Sat", SU: "Sun",
};
const ORD = ["", "1st", "2nd", "3rd", "4th", "5th"];
const MAX_OCCURRENCES = 1000;

/** Real UTC instant → fake-UTC Date carrying Central wall components. */
function toFake(iso: string | Date): Date {
  const dt = (typeof iso === "string" ? DateTime.fromISO(iso, { zone: "utc" }) : DateTime.fromJSDate(iso)).setZone(CAL_TZ);
  return new Date(Date.UTC(dt.year, dt.month - 1, dt.day, dt.hour, dt.minute, dt.second));
}

/** Fake-UTC Date → real UTC instant (interpreting the components as Central). */
function fromFake(d: Date): DateTime {
  return DateTime.fromObject(
    {
      year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
      hour: d.getUTCHours(), minute: d.getUTCMinutes(), second: d.getUTCSeconds(),
    },
    { zone: CAL_TZ },
  ).toUTC();
}

const pad = (n: number) => String(n).padStart(2, "0");
/** Floating (no Z) RRULE timestamp for a fake-UTC Date. */
function floating(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

/** Build the stored RRULE string. `startIso` is the first occurrence (UTC). */
export function buildRRule(r: Recurrence, startIso: string): string | null {
  if (r.freq === "none") return null;
  const parts = [`FREQ=${r.freq.toUpperCase()}`];
  const interval = Math.max(1, Math.min(99, Math.floor(r.interval || 1)));
  if (interval > 1) parts.push(`INTERVAL=${interval}`);
  const start = DateTime.fromISO(startIso, { zone: "utc" }).setZone(CAL_TZ);
  if (r.freq === "weekly") {
    const days = r.byDay.filter((d) => (DAY_CODES as readonly string[]).includes(d));
    const list = days.length ? days : [DAY_CODES[start.weekday - 1]];
    parts.push(`BYDAY=${DAY_CODES.filter((d) => list.includes(d)).join(",")}`);
  } else if (r.freq === "monthly") {
    if (r.monthlyMode === "nth") {
      const nth = Math.ceil(start.day / 7);
      parts.push(`BYDAY=${nth >= 5 ? -1 : nth}${DAY_CODES[start.weekday - 1]}`);
    } else {
      parts.push(`BYMONTHDAY=${start.day}`);
    }
  }
  if (r.endType === "until" && r.until) {
    const u = DateTime.fromISO(r.until, { zone: CAL_TZ });
    if (u.isValid) parts.push(`UNTIL=${u.toFormat("yyyyMMdd")}T235959`);
  } else if (r.endType === "count") {
    parts.push(`COUNT=${Math.max(1, Math.min(500, Math.floor(r.count || 1)))}`);
  }
  return parts.join(";");
}

/** Parse a stored RRULE back into the form's shape. */
export function parseRRule(rrule: string | null): Recurrence {
  if (!rrule) return { ...EMPTY_RECURRENCE };
  const map = Object.fromEntries(rrule.split(";").map((p) => p.split("=") as [string, string]));
  const freq = (map.FREQ || "").toLowerCase();
  const r: Recurrence = { ...EMPTY_RECURRENCE, freq: freq === "daily" || freq === "weekly" || freq === "monthly" ? freq : "none" };
  r.interval = Number(map.INTERVAL || 1) || 1;
  if (map.BYDAY && r.freq === "weekly") r.byDay = map.BYDAY.split(",");
  if (r.freq === "monthly") r.monthlyMode = map.BYDAY ? "nth" : "date";
  if (map.UNTIL) {
    r.endType = "until";
    r.until = `${map.UNTIL.slice(0, 4)}-${map.UNTIL.slice(4, 6)}-${map.UNTIL.slice(6, 8)}`;
  } else if (map.COUNT) {
    r.endType = "count";
    r.count = Number(map.COUNT) || 10;
  }
  return r;
}

function ruleFor(rrule: string, startIso: string): RRule {
  const opts: Partial<Options> = RRule.parseString(rrule);
  opts.dtstart = toFake(startIso);
  opts.tzid = undefined;
  return new RRule(opts);
}

/** End of the last occurrence (UTC ISO), or null if the rule never ends. */
export function seriesEnd(rrule: string | null, startIso: string, endIso: string): string | null {
  if (!rrule) return null;
  const durMs = Date.parse(endIso) - Date.parse(startIso);
  const rule = ruleFor(rrule, startIso);
  if (!rule.options.until && !rule.options.count) return null;
  const all = rule.all((_d, i) => i < MAX_OCCURRENCES);
  const last = all.at(-1);
  if (!last) return endIso;
  return fromFake(last).plus({ milliseconds: durMs }).toISO()!;
}

/** Cut a series so its last occurrence is before `occurrenceIso`. */
export function endSeriesBefore(rrule: string, occurrenceIso: string): string {
  const stop = new Date(toFake(occurrenceIso).getTime() - 1000);
  const kept = rrule.split(";").filter((p) => !p.startsWith("UNTIL=") && !p.startsWith("COUNT="));
  kept.push(`UNTIL=${floating(stop)}`);
  return kept.join(";");
}

interface SeriesLike {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  rrule: string | null;
  location: string | null;
  description: string | null;
  notes: string | null;
}

/**
 * Every occurrence of `ev` overlapping [rangeStart, rangeEnd), with cancelled
 * dates removed and modified dates swapped in.
 */
export function expandEvent(ev: SeriesLike, exceptions: ExceptionRow[], rangeStart: string, rangeEnd: string): Occurrence[] {
  const base = (start: string, end: string, occurrence: string): Occurrence => ({
    eventId: ev.id, occurrence, title: ev.title, start, end, allDay: ev.all_day,
    location: ev.location, description: ev.description, notes: ev.notes, modified: false,
  });
  const rs = Date.parse(rangeStart);
  const re = Date.parse(rangeEnd);
  const overlaps = (o: Occurrence) => Date.parse(o.start) < re && Date.parse(o.end) > rs;

  if (!ev.rrule) {
    const o = base(ev.starts_at, ev.ends_at, "");
    return overlaps(o) ? [o] : [];
  }

  const durMs = Date.parse(ev.ends_at) - Date.parse(ev.starts_at);
  const rule = ruleFor(ev.rrule, ev.starts_at);
  // Widen the window so moved occurrences whose original date is just
  // outside the range still land.
  const pad = 32 * 86400000;
  const from = toFake(new Date(rs - durMs - pad));
  const to = toFake(new Date(re + pad));
  const dates = rule.between(from, to, true).slice(0, MAX_OCCURRENCES);
  const exByStart = new Map(exceptions.map((x) => [new Date(x.original_start).toISOString(), x]));

  const out: Occurrence[] = [];
  for (const d of dates) {
    const s = fromFake(d);
    const occKey = s.toJSDate().toISOString();
    const o = base(occKey, s.plus({ milliseconds: durMs }).toJSDate().toISOString(), occKey);
    const x = exByStart.get(occKey);
    if (x?.kind === "cancelled") continue;
    if (x?.kind === "modified") {
      if (x.starts_at) o.start = new Date(x.starts_at).toISOString();
      if (x.ends_at) o.end = new Date(x.ends_at).toISOString();
      if (x.title) o.title = x.title;
      if (x.location !== null) o.location = x.location;
      if (x.description !== null) o.description = x.description;
      if (x.notes !== null) o.notes = x.notes;
      o.modified = true;
    }
    if (overlaps(o)) out.push(o);
  }
  return out;
}

/** "Every Tue and Thu until May 1, 2027" */
export function describeRecurrence(r: Recurrence, startIso: string | null): string {
  if (r.freq === "none") return "Does not repeat";
  const n = Math.max(1, r.interval || 1);
  const start = startIso ? DateTime.fromISO(startIso, { zone: "utc" }).setZone(CAL_TZ) : null;
  let s: string;
  if (r.freq === "daily") s = n === 1 ? "Every day" : `Every ${n} days`;
  else if (r.freq === "weekly") {
    const days = (r.byDay.length ? r.byDay : start ? [DAY_CODES[start.weekday - 1]] : [])
      .slice()
      .sort((a, b) => DAY_CODES.indexOf(a as never) - DAY_CODES.indexOf(b as never))
      .map((d) => DAY_NAMES[d] ?? d);
    const list = days.length > 1 ? `${days.slice(0, -1).join(", ")} and ${days.at(-1)}` : days[0] ?? "";
    s = `${n === 1 ? "Every" : `Every ${n} weeks on`} ${list}`.trim();
  } else {
    if (r.monthlyMode === "nth" && start) {
      const nth = Math.ceil(start.day / 7);
      s = `${n === 1 ? "Monthly" : `Every ${n} months`} on the ${nth >= 5 ? "last" : ORD[nth]} ${start.toFormat("cccc")}`;
    } else {
      s = `${n === 1 ? "Monthly" : `Every ${n} months`} on day ${start ? start.day : "?"}`;
    }
  }
  if (r.endType === "until" && r.until) {
    s += ` until ${DateTime.fromISO(r.until).toFormat("LLL d, yyyy")}`;
  } else if (r.endType === "count") {
    s += `, ${r.count} times`;
  }
  return s;
}
