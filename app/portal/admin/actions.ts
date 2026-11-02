"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireLead } from "@/lib/auth";

type Role = "student" | "mentor" | "lead";
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

export async function setRole(formData: FormData) {
  await assertLead();
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "") as Role;
  const lead_title = (String(formData.get("lead_title") ?? "") || null) as LeadTitle | null;
  const student_title = (String(formData.get("student_title") ?? "") || null) as StudentTitle | null;
  if (!id || !["student","mentor","lead"].includes(role)) return;
  const sb = await createClient();
  await sb
    .from("profiles")
    .update({
      role,
      lead_title: role === "lead" ? lead_title : null,
      student_title: role === "student" ? student_title : null,
    })
    .eq("id", id);
  revalidatePath("/portal/admin");
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
      lead_title: role === "lead" ? lead_title : null,
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
