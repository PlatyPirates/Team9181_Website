"use server";
import { revalidatePath } from "next/cache";
import { queueGoogleSync } from "@/lib/calendar/google-sync";
import { createClient } from "@/utils/supabase/server";
import { requireMember } from "@/lib/auth";
import { myPermissions } from "@/lib/calendar/server";
import { CAL_PERMISSIONS, type CalendarCategory, type CalendarPermission } from "@/lib/calendar/types";

async function need(perm: CalendarPermission) {
  const me = await requireMember("/portal/calendar");
  const sb = await createClient();
  const perms = await myPermissions(sb, me.id);
  if (!perms.includes(perm)) throw new Error("You don't have permission to do that.");
  return { me, sb };
}

const COLOR = /^#[0-9a-fA-F]{6}$/;

// ---- Permission grid -------------------------------------------------------

export async function setPermission(userId: string, permission: string, on: boolean): Promise<{ error?: string }> {
  try {
    const { me, sb } = await need("manage_permissions");
    if (!(CAL_PERMISSIONS as readonly string[]).includes(permission)) return { error: "Unknown permission." };
    const { error } = on
      ? await sb.from("calendar_user_permissions").upsert({ user_id: userId, permission, granted_by: me.id }, { onConflict: "user_id,permission", ignoreDuplicates: true })
      : await sb.from("calendar_user_permissions").delete().eq("user_id", userId).eq("permission", permission);
    if (error) return { error: error.message };
    revalidatePath("/portal/calendar/admin/permissions");
    queueGoogleSync();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't save." };
  }
}

export async function resetToDefaults(userId: string): Promise<{ error?: string }> {
  try {
    const { sb } = await need("manage_permissions");
    const { error } = await sb.rpc("cal_reset_to_defaults", { uid: userId });
    if (error) return { error: error.message };
    revalidatePath("/portal/calendar/admin/permissions");
    queueGoogleSync();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't reset." };
  }
}

// ---- Categories ------------------------------------------------------------

export async function createCategory(name: string, color: string): Promise<{ error?: string; category?: CalendarCategory }> {
  try {
    const { me, sb } = await need("manage_categories");
    const n = name.trim().slice(0, 60);
    if (!n) return { error: "Name the category." };
    if (!COLOR.test(color)) return { error: "Pick a color." };
    const { data, error } = await sb
      .from("calendar_categories")
      .insert({ name: n, color, created_by: me.id })
      .select("id, name, color, is_preset, archived, sort")
      .single();
    if (error) return { error: error.code === "23505" ? "There's already a category with that name." : error.message };
    revalidatePath("/portal/calendar/admin/categories");
    return { category: data as CalendarCategory };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't add the category." };
  }
}

export async function updateCategoryForm(formData: FormData): Promise<void> {
  const { sb } = await need("manage_categories");
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const color = String(formData.get("color") ?? "");
  const archived = formData.get("archived") === "on";
  if (!id || !name || !COLOR.test(color)) return;
  await sb.from("calendar_categories").update({ name, color, archived }).eq("id", id);
  revalidatePath("/portal/calendar/admin/categories");
  queueGoogleSync();
  revalidatePath("/portal/calendar");
}

export async function createCategoryForm(formData: FormData): Promise<void> {
  await createCategory(String(formData.get("name") ?? ""), String(formData.get("color") ?? ""));
}

// ---- Groups ----------------------------------------------------------------

export async function addGroupMember(formData: FormData): Promise<void> {
  const { me, sb } = await need("manage_groups");
  const group_id = String(formData.get("group_id") ?? "");
  const user_id = String(formData.get("user_id") ?? "");
  if (!group_id || !user_id) return;
  const { data: row } = await sb.from("calendar_group_members").select("source").eq("group_id", group_id).eq("user_id", user_id).maybeSingle();
  if (row) await sb.from("calendar_group_members").update({ excluded: false, added_by: me.id }).eq("group_id", group_id).eq("user_id", user_id);
  else await sb.from("calendar_group_members").insert({ group_id, user_id, source: "manual", added_by: me.id });
  revalidatePath("/portal/calendar/admin/groups");
  queueGoogleSync();
}

export async function removeGroupMember(formData: FormData): Promise<void> {
  const { me, sb } = await need("manage_groups");
  const group_id = String(formData.get("group_id") ?? "");
  const user_id = String(formData.get("user_id") ?? "");
  if (!group_id || !user_id) return;
  const { data: row } = await sb.from("calendar_group_members").select("source").eq("group_id", group_id).eq("user_id", user_id).maybeSingle();
  if (!row) return;
  // Auto members are kept as "excluded" so the automatic fill doesn't re-add them.
  if (row.source === "auto") await sb.from("calendar_group_members").update({ excluded: true, added_by: me.id }).eq("group_id", group_id).eq("user_id", user_id);
  else await sb.from("calendar_group_members").delete().eq("group_id", group_id).eq("user_id", user_id);
  revalidatePath("/portal/calendar/admin/groups");
  queueGoogleSync();
}
