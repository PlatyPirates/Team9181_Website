"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { requireLead } from "@/lib/auth";
import { queueGoogleSync } from "@/lib/calendar/google-sync";
import { GRANT_SCOPES, SUBTEAMS } from "@/lib/profile";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export interface GrantState {
  ok?: string;
  error?: string;
}

export async function createGrant(_prev: GrantState, fd: FormData): Promise<GrantState> {
  const me = await requireLead("/portal/admin");
  const grantee = str(fd, "grantee");
  const scopes = fd.getAll("scope").map(String).filter((s) => GRANT_SCOPES.some((g) => g.key === s));
  const subteams = fd.getAll("subteams").map(String).filter((s) => (SUBTEAMS as readonly string[]).includes(s));
  const expires = str(fd, "expires_on");
  if (!grantee) return { error: "Pick who gets access." };
  if (scopes.length === 0) return { error: "Pick at least one kind of access." };
  if (expires && !/^\d{4}-\d{2}-\d{2}$/.test(expires)) return { error: "The end date doesn't look right." };
  const sb = await createClient();
  const { error } = await sb.from("profile_access_grants").insert(
    scopes.map((scope) => ({
      grantee,
      scope,
      subteams: subteams.length ? subteams : null,
      expires_on: expires || null,
      granted_by: me.id,
    })),
  );
  if (error) return { error: error.message };
  revalidatePath("/portal/admin");
  return { ok: `Access given (${scopes.length}).` };
}

export async function revokeGrant(fd: FormData): Promise<void> {
  const me = await requireLead("/portal/admin");
  const sb = await createClient();
  await sb
    .from("profile_access_grants")
    .update({ revoked_at: new Date().toISOString(), revoked_by: me.id })
    .eq("id", str(fd, "id"))
    .is("revoked_at", null);
  revalidatePath("/portal/admin");
}

export async function decideLinkRequest(fd: FormData): Promise<void> {
  const me = await requireLead("/portal/admin");
  const id = str(fd, "id");
  const decision = str(fd, "decision");
  const studentId = str(fd, "student_id");
  const sb = await createClient();
  const { data: req } = await sb.from("guardian_link_requests").select("id, parent_id, status").eq("id", id).maybeSingle();
  if (!req || req.status !== "pending") return;
  if (decision === "approve") {
    if (!studentId || studentId === req.parent_id) return;
    const { error } = await sb
      .from("guardian_links")
      .upsert({ parent_id: req.parent_id, student_id: studentId, created_by: me.id }, { onConflict: "parent_id,student_id", ignoreDuplicates: true });
    if (error) return;
    await sb
      .from("guardian_link_requests")
      .update({ status: "approved", student_id: studentId, decided_by: me.id, decided_at: new Date().toISOString() })
      .eq("id", id);
    queueGoogleSync();
  } else if (decision === "decline") {
    await sb
      .from("guardian_link_requests")
      .update({ status: "declined", decided_by: me.id, decided_at: new Date().toISOString() })
      .eq("id", id);
  }
  revalidatePath("/portal/admin");
  revalidatePath("/portal/roster");
}

export async function decidePhoto(fd: FormData): Promise<void> {
  await requireLead("/portal/admin");
  const id = str(fd, "id");
  const decision = str(fd, "decision");
  const sb = await createClient();
  if (decision === "approve") {
    await sb.from("profiles").update({ photo_status: "approved", avatar_mode: "photo" }).eq("id", id);
  } else if (decision === "approve_always") {
    await sb.from("profiles").update({ photo_status: "approved", avatar_mode: "photo", photo_auto_approve: true }).eq("id", id);
  } else if (decision === "reject") {
    await sb.from("profiles").update({ photo_status: "rejected", avatar_mode: "avatar" }).eq("id", id);
  }
  revalidatePath("/portal/admin");
  revalidatePath("/portal/roster");
}

export async function setAutoApprove(fd: FormData): Promise<void> {
  await requireLead("/portal/admin");
  const sb = await createClient();
  await sb.from("profiles").update({ photo_auto_approve: str(fd, "value") === "on" }).eq("id", str(fd, "id"));
  revalidatePath("/portal/admin");
}
