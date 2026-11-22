import { DateTime } from "luxon";
import { CAL_TZ } from "./types";

/** Central wall date + time → UTC ISO. */
export function wallToUtc(date: string, time: string | null): string {
  const dt = DateTime.fromISO(`${date}T${time || "00:00"}`, { zone: CAL_TZ });
  if (!dt.isValid) throw new Error("Invalid date or time.");
  return dt.toUTC().toISO()!;
}

/** UTC ISO → Central wall { date, time }. */
export function utcToWall(iso: string): { date: string; time: string } {
  const dt = DateTime.fromISO(iso, { zone: "utc" }).setZone(CAL_TZ);
  return { date: dt.toFormat("yyyy-MM-dd"), time: dt.toFormat("HH:mm") };
}

/** UTC ISO → Central date (yyyy-MM-dd). */
export function utcToWallDate(iso: string): string {
  return DateTime.fromISO(iso, { zone: "utc" }).setZone(CAL_TZ).toFormat("yyyy-MM-dd");
}

/** Human time range in Central, e.g. "Tue, Nov 24 · 6:00–8:00 PM CT". */
export function formatRange(startIso: string, endIso: string, allDay: boolean, zone: string = CAL_TZ): string {
  const s = DateTime.fromISO(startIso, { zone: "utc" }).setZone(zone);
  let e = DateTime.fromISO(endIso, { zone: "utc" }).setZone(zone);
  const abbr = zone === CAL_TZ ? "CT" : s.toFormat("ZZZZ");
  if (allDay) {
    e = e.minus({ days: 1 });
    if (e <= s || e.hasSame(s, "day")) return `${s.toFormat("ccc, LLL d, yyyy")} · all day`;
    return `${s.toFormat("ccc, LLL d")} – ${e.toFormat("ccc, LLL d, yyyy")} · all day`;
  }
  if (s.hasSame(e, "day")) {
    return `${s.toFormat("ccc, LLL d, yyyy")} · ${s.toFormat("h:mm a")}–${e.toFormat("h:mm a")} ${abbr}`;
  }
  return `${s.toFormat("ccc, LLL d, h:mm a")} – ${e.toFormat("ccc, LLL d, h:mm a")} ${abbr}`;
}
