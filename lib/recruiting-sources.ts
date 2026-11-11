import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { KINDS, nativeFormHref, type Kind, type RecruitingSource } from "@/lib/recruiting";

export const SOURCES_TAG = "recruiting-sources";

const DEFAULTS: Record<Kind, RecruitingSource> = {
  student: { kind: "student", mode: "native", google_form_url: null, google_sheet_url: null },
  mentor: { kind: "mentor", mode: "native", google_form_url: null, google_sheet_url: null },
  sponsor: { kind: "sponsor", mode: "native", google_form_url: null, google_sheet_url: null },
};

/**
 * Which form each Join Us tile uses. Cached and refreshed when a Lead saves
 * Recruiting settings. Falls back to the native forms if the table isn't
 * there yet (migration 0003 not run) or env vars are missing.
 */
export async function getRecruitingSources(): Promise<Record<Kind, RecruitingSource>> {
  "use cache";
  cacheTag(SOURCES_TAG);
  cacheLife("hours");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return DEFAULTS;
  try {
    const sb = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await sb.from("recruiting_sources").select("kind, mode, google_form_url, google_sheet_url");
    if (error || !data) return DEFAULTS;
    const out = { ...DEFAULTS };
    for (const row of data as RecruitingSource[]) {
      if ((KINDS as readonly string[]).includes(row.kind)) out[row.kind] = row;
    }
    return out;
  } catch {
    return DEFAULTS;
  }
}

/** Where a tile should send people right now. */
export function formHref(src: RecruitingSource): { href: string; external: boolean } {
  if (src.mode === "google" && src.google_form_url) return { href: src.google_form_url, external: true };
  return { href: nativeFormHref(src.kind), external: false };
}
