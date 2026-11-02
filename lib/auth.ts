import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type Role = "student" | "mentor" | "lead";
export type LeadTitle = "coach" | "team_admin" | null;
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

export function roleLabel(m: Pick<Member, "role" | "lead_title" | "student_title">): string {
  if (m.role === "lead") {
    if (m.lead_title === "team_admin") return "Team Admin";
    if (m.lead_title === "coach") return "Coach";
    return "Lead";
  }
  if (m.role === "mentor") return "Mentor";
  if (m.student_title === "team_captain") return "Team Captain";
  if (m.student_title === "subteam_lead") return "Sub-Team Lead";
  return "Student";
}
