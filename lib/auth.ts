import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { roleTreeLabel } from "@/lib/roles";

export type Role = "student" | "mentor" | "lead" | "parent";
export type LeadTitle = "lead_coach_1" | "lead_coach_2" | "finance" | "coach" | null;
export type StudentTitle = "team_captain" | "subteam_lead" | null;
export type Status = "pending" | "active" | "disabled";

export interface Member {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: Role;
  lead_title: LeadTitle;
  student_title: StudentTitle;
  status: Status;
  subteam: string | null;
}

const MEMBER_COLS = "id, username, full_name, email, role, lead_title, student_title, status, subteam";

export const getAuthUser = cache(async () => {
  // Signed-in state is per request. Supabase checks token expiry with Date.now(),
  // which cacheComponents rejects while prerendering ("blocking-prerender-current-time"),
  // so mark everything that reads the session as request-time first.
  await connection();
  const sb = await createClient();
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
});

export const getMember = cache(async (): Promise<Member | null> => {
  const user = await getAuthUser();
  if (!user) return null;
  const sb = await createClient();
  const { data, error } = await sb.from("profiles").select(MEMBER_COLS).eq("id", user.id).maybeSingle();
  if (error || !data) return null;
  return data as Member;
});

export async function requireMember(nextPath?: string): Promise<Member> {
  const m = await getMember();
  if (!m) {
    const q = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
    redirect(`/portal/login${q}`);
  }
  if (m.status !== "active") redirect("/portal/pending");
  return m;
}

export async function requireLead(nextPath?: string): Promise<Member> {
  const m = await requireMember(nextPath);
  if (m.role !== "lead") redirect("/portal");
  return m;
}

export function roleLabel(
  m: Pick<Member, "role" | "lead_title" | "student_title"> & { mentor_title?: string | null; is_team_admin?: boolean | null; is_alumni?: boolean | null },
): string {
  return roleTreeLabel(m);
}
