"use server";
import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { requireLead, requireMember } from "@/lib/auth";
import { KINDS, STATUSES, cleanGoogleUrl, type InquiryStatus } from "@/lib/recruiting";
import { SOURCES_TAG } from "@/lib/recruiting-sources";
import { sendTestPush } from "@/lib/recruiting-server";

export async function updateInquiry(formData: FormData) {
  const me = await requireLead("/portal/recruiting");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as InquiryStatus;
  const notes = String(formData.get("notes") ?? "").slice(0, 5000);
  if (!id || !(STATUSES as readonly string[]).includes(status)) return;
  const sb = await createClient();
  await sb.from("recruiting_inquiries").update({ status, notes: notes || null, handled_by: me.id }).eq("id", id);
  revalidatePath("/portal/recruiting");
}

export async function deleteInquiry(formData: FormData) {
  await requireLead("/portal/recruiting");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const sb = await createClient();
  await sb.from("recruiting_inquiries").delete().eq("id", id);
  revalidatePath("/portal/recruiting");
}

export interface SettingsState { ok?: string; error?: string }

export async function saveSources(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  await requireLead("/portal/recruiting/settings");
  const sb = await createClient();
  for (const kind of KINDS) {
    const mode = formData.get(`${kind}_mode`) === "google" ? "google" : "native";
    const rawForm = String(formData.get(`${kind}_form`) ?? "");
    const rawSheet = String(formData.get(`${kind}_sheet`) ?? "");
    const form = cleanGoogleUrl(rawForm);
    const sheet = cleanGoogleUrl(rawSheet);
    if (rawForm.trim() && !form) return { error: `The ${kind} Google Form link must be an https://docs.google.com or forms.gle link.` };
    if (rawSheet.trim() && !sheet) return { error: `The ${kind} Sheet link must be an https://docs.google.com link.` };
    if (mode === "google" && !form) return { error: `Add the Google Form link for ${kind}s, or switch them back to the website form.` };
    const { error } = await sb
      .from("recruiting_sources")
      .update({ mode, google_form_url: form, google_sheet_url: sheet, updated_at: new Date().toISOString() })
      .eq("kind", kind);
    if (error) return { error: error.message };
  }
  updateTag(SOURCES_TAG);
  revalidatePath("/portal/recruiting/settings");
  return { ok: "Saved. The Join Us page now uses these links." };
}

export async function regenerateSecret() {
  await requireLead("/portal/recruiting/settings");
  const sb = await createClient();
  const secret = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  await sb.from("recruiting_secret").update({ secret, updated_at: new Date().toISOString() }).eq("id", 1);
  revalidatePath("/portal/recruiting/settings");
}

export interface PrefsState { ok?: string; error?: string }

export async function savePrefs(_prev: PrefsState, formData: FormData): Promise<PrefsState> {
  const me = await requireMember("/portal/profile");
  const kinds = KINDS.filter((k) => formData.get(`kind_${k}`) === "on");
  const ntfy_enabled = formData.get("ntfy_enabled") === "on";
  const ntfy_topic = String(formData.get("ntfy_topic") ?? "").trim();
  if (ntfy_topic && !/^[A-Za-z0-9_-]{6,64}$/.test(ntfy_topic))
    return { error: "Topic name: 6–64 letters, numbers, dashes or underscores." };
  if (ntfy_enabled && !ntfy_topic) return { error: "Add a topic name to turn on phone alerts." };
  const sb = await createClient();
  const { error } = await sb.from("notification_prefs").upsert({
    user_id: me.id,
    email_alerts: formData.get("email_alerts") === "on",
    ntfy_enabled,
    ntfy_topic: ntfy_topic || null,
    kinds,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };
  if (formData.get("intent") === "test") {
    if (!ntfy_topic) return { error: "Add a topic name first." };
    const ok = await sendTestPush(ntfy_topic);
    return ok ? { ok: "Saved, and a test alert was sent. Check your phone." } : { error: "Saved, but ntfy didn't accept the test alert." };
  }
  revalidatePath("/portal/profile");
  return { ok: "Saved." };
}

