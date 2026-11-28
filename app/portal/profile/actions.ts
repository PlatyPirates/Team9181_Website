"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { requireMember } from "@/lib/auth";
import {
  AVATAR_OPTIONS,
  SECTIONS,
  selectOptions,
  isYearSelect,
  sectionsFor,
  type AvatarConfig,
  type Field,
  type SectionKey,
  type Table,
} from "@/lib/profile";

export interface SaveState {
  ok?: boolean;
  error?: string;
  savedAt?: number;
}

type SB = Awaited<ReturnType<typeof createClient>>;

async function editorFor(subjectId: string) {
  const me = await requireMember("/portal/profile");
  const sb = await createClient();
  let allowed = me.id === subjectId || me.role === "lead";
  if (!allowed) {
    const { data } = await sb
      .from("guardian_links")
      .select("parent_id")
      .eq("parent_id", me.id)
      .eq("student_id", subjectId)
      .maybeSingle();
    allowed = !!data;
  }
  return { me, sb, allowed };
}

async function refresh(sb: SB, subjectId: string) {
  const { data } = await sb.from("profiles").select("username").eq("id", subjectId).maybeSingle();
  revalidatePath("/portal/profile");
  revalidatePath("/portal/roster");
  if (data?.username) revalidatePath(`/portal/roster/${data.username}`);
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

function parseField(f: Field, fd: FormData): { value?: unknown; error?: string } {
  const raw = str(fd, f.key);
  switch (f.type) {
    case "multi": {
      const allowed = new Set((f.options ?? []).map((o) => o.value));
      return { value: fd.getAll(f.key).map(String).filter((x) => allowed.has(x)) };
    }
    case "checkbox":
      return { value: fd.get(f.key) === "on" };
    case "number": {
      if (!raw) return { value: null };
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 1990 || n > 2100) return { error: `${f.label} should be a year like 2026.` };
      return { value: n };
    }
    case "select": {
      if (!raw) return { value: null };
      if (!selectOptions(f).some((o) => o.value === raw)) return { error: `Pick a valid ${f.label.toLowerCase()}.` };
      return { value: isYearSelect(f) ? Number(raw) : raw };
    }
    case "email":
      if (raw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return { error: `${f.label} doesn't look like an email address.` };
      return { value: raw || null };
    case "tel":
      if (raw && raw.replace(/\D/g, "").length < 7) return { error: `${f.label} looks too short.` };
      return { value: raw || null };
    case "date":
      if (raw && !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { error: `${f.label} should be a date.` };
      return { value: raw || null };
    default:
      return { value: raw ? raw.slice(0, f.max ?? 500) : null };
  }
}

/** Saves one section card. Only fields the editor may change are written. */
export async function saveSection(
  subjectId: string,
  sectionKey: SectionKey,
  _prev: SaveState,
  fd: FormData,
): Promise<SaveState> {
  const { me, sb, allowed } = await editorFor(subjectId);
  if (!allowed) return { error: "You can't edit this profile." };
  const { data: subj } = await sb.from("profiles").select("role").eq("id", subjectId).maybeSingle();
  if (!subj) return { error: "Profile not found." };
  const section = sectionsFor(subj.role).find((s) => s.key === sectionKey) ??
    SECTIONS.find((s) => s.key === sectionKey);
  if (!section) return { error: "Unknown section." };
  if (sectionKey === "admin" && me.role !== "lead") return { error: "Only Leads can edit admin records." };

  const isLead = me.role === "lead";
  const byTable = new Map<Table, Record<string, unknown>>();
  const put = (t: Table, k: string, v: unknown) => {
    if (!byTable.has(t)) byTable.set(t, {});
    byTable.get(t)![k] = v;
  };

  // Current consent values, so a re-save keeps the original date and person.
  let consents: Record<string, unknown> | null = null;
  if (section.fields.some((f) => f.table === "profile_consents")) {
    const { data } = await sb
      .from("profile_consents")
      .select("parental_permission_at, parental_permission_by, media_consent, media_consent_at, media_consent_by, contact_ack_at, contact_ack_by")
      .eq("user_id", subjectId)
      .maybeSingle();
    consents = data ?? {};
  }

  let birthday: { month: number; day: number; is_public: boolean } | null | undefined;

  for (const f of section.fields) {
    if (f.leadOnly && !isLead) continue;
    if (f.type === "birthday") {
      const m = Number(str(fd, "birthday_month"));
      const d = Number(str(fd, "birthday_day"));
      if (!m && !d) birthday = null;
      else if (m >= 1 && m <= 12 && d >= 1 && d <= new Date(2024, m, 0).getDate())
        birthday = { month: m, day: d, is_public: fd.get("birthday_public") === "on" };
      else return { error: "Pick both a month and a valid day for the birthday." };
      continue;
    }
    if (f.type === "consent") {
      const on = fd.get(f.key) === "on";
      const at = consents?.[`${f.key}_at`] ?? null;
      put(f.table, `${f.key}_at`, on ? at ?? new Date().toISOString() : null);
      put(f.table, `${f.key}_by`, on ? (at ? consents?.[`${f.key}_by`] ?? me.id : me.id) : null);
      continue;
    }
    if (f.type === "yesno") {
      const raw = str(fd, f.key);
      const v = raw === "yes" ? true : raw === "no" ? false : null;
      const changed = v !== (consents?.[f.key] ?? null);
      put(f.table, f.key, v);
      put(f.table, `${f.key}_at`, v === null ? null : changed ? new Date().toISOString() : consents?.[`${f.key}_at`] ?? new Date().toISOString());
      put(f.table, `${f.key}_by`, v === null ? null : changed ? me.id : consents?.[`${f.key}_by`] ?? me.id);
      continue;
    }
    const { value, error } = parseField(f, fd);
    if (error) return { error };
    if (f.key === "full_name" && !value) return { error: "Full name can't be empty." };
    put(f.table, f.key, value);
  }

  for (const [table, row] of byTable) {
    const res =
      table === "profiles"
        ? await sb.from("profiles").update(row).eq("id", subjectId)
        : await sb.from(table).upsert({ user_id: subjectId, ...row, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (res.error) return { error: res.error.message };
  }
  if (birthday !== undefined) {
    const res = birthday
      ? await sb.from("profile_birthday").upsert({ user_id: subjectId, ...birthday, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
      : await sb.from("profile_birthday").delete().eq("user_id", subjectId);
    if (res.error) return { error: res.error.message };
  }

  await refresh(sb, subjectId);
  return { ok: true, savedAt: Date.now() };
}

// ---------------------------------------------------------------- guardians without an account
export async function saveGuardian(subjectId: string, _prev: SaveState, fd: FormData): Promise<SaveState> {
  const { sb, allowed } = await editorFor(subjectId);
  if (!allowed) return { error: "You can't edit this profile." };
  const id = str(fd, "id");
  const row = {
    student_id: subjectId,
    name: str(fd, "name").slice(0, 120),
    relationship: str(fd, "relationship").slice(0, 60) || null,
    email: str(fd, "email").slice(0, 160) || null,
    phone: str(fd, "phone").slice(0, 30) || null,
    employer: str(fd, "employer").slice(0, 120) || null,
    updated_at: new Date().toISOString(),
  };
  if (!row.name) return { error: "Add the guardian's name." };
  if (!row.email && !row.phone) return { error: "Add an email or a phone number so the team can reach them." };
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) return { error: "That email doesn't look right." };
  if (!id) {
    const { count } = await sb.from("profile_guardians").select("id", { count: "exact", head: true }).eq("student_id", subjectId);
    if ((count ?? 0) >= 2) return { error: "Up to two guardians can be listed here. Linked parent accounts don't count toward this." };
  }
  const res = id
    ? await sb.from("profile_guardians").update(row).eq("id", id).eq("student_id", subjectId)
    : await sb.from("profile_guardians").insert(row);
  if (res.error) return { error: res.error.message };
  await refresh(sb, subjectId);
  return { ok: true, savedAt: Date.now() };
}

export async function deleteGuardian(subjectId: string, fd: FormData): Promise<void> {
  const { sb, allowed } = await editorFor(subjectId);
  if (!allowed) return;
  await sb.from("profile_guardians").delete().eq("id", str(fd, "id")).eq("student_id", subjectId);
  await refresh(sb, subjectId);
}

// ---------------------------------------------------------------- avatar and photo
export async function saveAvatar(subjectId: string, config: AvatarConfig): Promise<SaveState> {
  const { sb, allowed } = await editorFor(subjectId);
  if (!allowed) return { error: "You can't edit this profile." };
  const clean: AvatarConfig = {};
  for (const k of Object.keys(AVATAR_OPTIONS) as (keyof AvatarConfig)[]) {
    const v = config?.[k];
    if (typeof v === "string" && (AVATAR_OPTIONS[k] as readonly string[]).includes(v)) clean[k] = v;
  }
  const { error } = await sb.from("profiles").update({ avatar_config: clean, avatar_mode: "avatar" }).eq("id", subjectId);
  if (error) return { error: error.message };
  await refresh(sb, subjectId);
  return { ok: true, savedAt: Date.now() };
}

export async function setPhoto(subjectId: string, path: string): Promise<SaveState> {
  const { sb, allowed } = await editorFor(subjectId);
  if (!allowed) return { error: "You can't edit this profile." };
  if (!path.startsWith(`${subjectId}/`) || path.includes("..")) return { error: "Upload failed. Try again." };
  const { data: before } = await sb.from("profiles").select("photo_path").eq("id", subjectId).maybeSingle();
  const { error } = await sb.from("profiles").update({ photo_path: path, avatar_mode: "photo" }).eq("id", subjectId);
  if (error) return { error: error.message };
  if (before?.photo_path && before.photo_path !== path) await sb.storage.from("avatars").remove([before.photo_path]);
  await refresh(sb, subjectId);
  return { ok: true, savedAt: Date.now() };
}

export async function setAvatarMode(subjectId: string, mode: "avatar" | "photo"): Promise<SaveState> {
  const { sb, allowed } = await editorFor(subjectId);
  if (!allowed) return { error: "You can't edit this profile." };
  const { error } = await sb.from("profiles").update({ avatar_mode: mode }).eq("id", subjectId);
  if (error) return { error: error.message };
  await refresh(sb, subjectId);
  return { ok: true };
}

export async function removePhoto(subjectId: string): Promise<SaveState> {
  const { sb, allowed } = await editorFor(subjectId);
  if (!allowed) return { error: "You can't edit this profile." };
  const { data } = await sb.from("profiles").select("photo_path").eq("id", subjectId).maybeSingle();
  const { error } = await sb.from("profiles").update({ photo_path: null, avatar_mode: "avatar" }).eq("id", subjectId);
  if (error) return { error: error.message };
  if (data?.photo_path) await sb.storage.from("avatars").remove([data.photo_path]);
  await refresh(sb, subjectId);
  return { ok: true };
}

// ---------------------------------------------------------------- parent link requests
export async function requestStudentLink(_prev: SaveState, fd: FormData): Promise<SaveState> {
  const me = await requireMember("/portal/profile");
  const name = str(fd, "student_name").slice(0, 120);
  if (name.length < 2) return { error: "Type your student's full name." };
  const sb = await createClient();
  const { count } = await sb
    .from("guardian_link_requests")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", me.id)
    .eq("status", "pending");
  if ((count ?? 0) >= 6) return { error: "You have several requests waiting already. A Lead will review them soon." };
  const { error } = await sb.from("guardian_link_requests").insert({ parent_id: me.id, student_name: name });
  if (error) return { error: error.message };
  revalidatePath("/portal/profile");
  revalidatePath("/portal/admin");
  return { ok: true, savedAt: Date.now() };
}

export async function withdrawLinkRequest(fd: FormData): Promise<void> {
  const me = await requireMember("/portal/profile");
  const sb = await createClient();
  await sb.from("guardian_link_requests").delete().eq("id", str(fd, "id")).eq("parent_id", me.id).eq("status", "pending");
  revalidatePath("/portal/profile");
  revalidatePath("/portal/admin");
}
