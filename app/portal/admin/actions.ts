"use server";
import { revalidatePath } from "next/cache";
import { queueGoogleSync } from "@/lib/calendar/google-sync";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireLead } from "@/lib/auth";
import { LEGACY_LEAD_TITLES, ROLE_FLAGS, ROLE_TREE, isValidSubRole } from "@/lib/roles";
import { SUBTEAMS } from "@/lib/profile";

type Role = "student" | "mentor" | "lead" | "parent";
type LeadTitle = "coach" | "team_admin";
type StudentTitle = "team_captain" | "subteam_lead";
type Status = "pending" | "active" | "disabled";

async function assertLead() { await requireLead("/portal/admin"); }

export async function approveMember(formData: FormData) {
  await assertLead();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const sb = await createClient();
  await sb.from("profiles").update({ status: "active" }).eq("id", id);
  revalidatePath("/portal/admin");
}

export interface RoleState { ok?: string; error?: string; at?: number }

export async function setRole(_prev: RoleState, formData: FormData): Promise<RoleState> {
  await assertLead();
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "") as Role;
  const sub = String(formData.get("sub") ?? "");
  const entry = ROLE_TREE.find((r) => r.value === role);
  if (!id || !entry) return { error: "Pick a role.", at: Date.now() };

  const update: Record<string, string | boolean | null> = {
    role,
    lead_title: null,
    student_title: null,
    mentor_title: null,
    has_student: null,
    is_team_admin: false,
    is_alumni: false,
  };
  const flag = ROLE_FLAGS[role];
  if (flag) update[flag.field] = formData.get("flag") === "on";
  if (role === "parent") {
    if (sub !== "yes" && sub !== "no") return { error: "Pick yes or no.", at: Date.now() };
    update.has_student = sub === "yes";
  } else {
    const allowed = role === "lead" ? [...entry.options, ...LEGACY_LEAD_TITLES] : entry.options;
    if (!isValidSubRole(allowed, sub)) return { error: "Pick a valid option.", at: Date.now() };
    update[entry.field] = sub || null;
  }

  const sb = await createClient();
  const { error } = await sb.from("profiles").update(update).eq("id", id);
  if (error) return { error: error.message, at: Date.now() };
  revalidatePath("/portal/admin");
  return { ok: "Saved", at: Date.now() };
}

export async function setStatus(formData: FormData) {
  await assertLead();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as Status;
  if (!id || !["pending","active","disabled"].includes(status)) return;
  const sb = await createClient();
  await sb.from("profiles").update({ status }).eq("id", id);
  revalidatePath("/portal/admin");
}

export async function setSubteams(formData: FormData) {
  await assertLead();
  const id = String(formData.get("id") ?? "");
  const subteams = formData.getAll("subteams").map(String).filter((t) => (SUBTEAMS as readonly string[]).includes(t));
  if (!id) return;
  const sb = await createClient();
  await sb.from("profiles").update({ subteams }).eq("id", id);
  revalidatePath("/portal/admin");
  revalidatePath("/portal/roster");
}

export interface CreateState { error?: string; ok?: string }

export async function createAccount(_prev: CreateState, formData: FormData): Promise<CreateState> {
  await assertLead();
  const full_name = String(formData.get("full_name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "student") as Role;
  const lead_title = (String(formData.get("lead_title") ?? "") || null) as LeadTitle | null;
  const student_title = (String(formData.get("student_title") ?? "") || null) as StudentTitle | null;
  if (!full_name || !username || !email || !password) return { error: "Fill in every field." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const admin = createAdminClient();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name, username },
  });
  if (createErr || !created?.user) return { error: createErr?.message ?? "Could not create user." };

  const { error: upErr } = await admin
    .from("profiles")
    .update({
      full_name, username, role,
      // The old "Team Admin" title is now the is_team_admin checkbox.
      lead_title: role === "lead" && lead_title !== "team_admin" ? lead_title : null,
      is_team_admin: role === "lead" && lead_title === "team_admin",
      student_title: role === "student" ? student_title : null,
      status: "active",
    })
    .eq("id", created.user.id);
  if (upErr) return { error: upErr.message };

  revalidatePath("/portal/admin");
  return { ok: `Account created for ${username}.` };
}

export async function sendPasswordReset(formData: FormData) {
  await assertLead();
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return;
  const admin = createAdminClient();
  await admin.auth.resetPasswordForEmail(email);
  revalidatePath("/portal/admin");
}

export async function linkGuardian(formData: FormData) {
  const me = await requireLead("/portal/admin");
  const parent_id = String(formData.get("parent_id") ?? "");
  const student_id = String(formData.get("student_id") ?? "");
  if (!parent_id || !student_id || parent_id === student_id) return;
  const sb = await createClient();
  await sb.from("guardian_links").upsert({ parent_id, student_id, created_by: me.id }, { onConflict: "parent_id,student_id", ignoreDuplicates: true });
  revalidatePath("/portal/admin");
  queueGoogleSync();
}

export async function unlinkGuardian(formData: FormData) {
  await assertLead();
  const parent_id = String(formData.get("parent_id") ?? "");
  const student_id = String(formData.get("student_id") ?? "");
  if (!parent_id || !student_id) return;
  const sb = await createClient();
  await sb.from("guardian_links").delete().eq("parent_id", parent_id).eq("student_id", student_id);
  revalidatePath("/portal/admin");
  queueGoogleSync();
}
