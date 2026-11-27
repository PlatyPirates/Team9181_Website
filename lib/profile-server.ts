import "server-only";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import type { Member } from "@/lib/auth";
import {
  CARD_COLS,
  PROFILE_COLS,
  SECTIONS,
  appliesTo,
  canSeeField,
  sectionsFor,
  type CardRow,
  type Change,
  type Grant,
  type ProfileRow,
  type Viewer,
} from "@/lib/profile";

export type Values = Record<string, unknown>;

export interface GuardianRow {
  id: string;
  name: string;
  relationship: string | null;
  email: string | null;
  phone: string | null;
  employer: string | null;
}

export interface LinkedParent {
  card: CardRow;
  phone: string | null;
  email: string | null;   // personal email, else login email when visible
  employer: string | null;
}

export interface LoadedProfile {
  subject: ProfileRow;
  viewer: Viewer;
  isParentAccount: boolean;
  values: Values;               // every visible field, keyed by field key
  guardians: GuardianRow[];     // guardians without an account
  parents: LinkedParent[];      // linked parent accounts
  students: CardRow[];          // students this subject is a parent of
  changes: Change[];
  names: Record<string, string>;
  photoUrl: string | null;      // shown to everyone (approved)
  pendingPhotoUrl: string | null; // shown to self, parents, Leads while waiting
}

export async function myGrants(sb: Awaited<ReturnType<typeof createClient>>, me: string): Promise<Grant[]> {
  const { data } = await sb
    .from("profile_access_grants")
    .select("id, grantee, scope, subteams, expires_on")
    .eq("grantee", me)
    .is("revoked_at", null);
  return (data ?? []) as Grant[];
}

/** Signed URLs for photos. The bucket is private; we only sign what the viewer may see. */
export async function signPhotos(paths: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (unique.length === 0) return {};
  try {
    const admin = createAdminClient();
    const { data } = await admin.storage.from("avatars").createSignedUrls(unique, 60 * 60);
    const out: Record<string, string> = {};
    for (const d of data ?? []) if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
    return out;
  } catch {
    return {};
  }
}

export const shownPhotoPath = (p: Pick<CardRow, "avatar_mode" | "photo_path" | "photo_status">) =>
  p.avatar_mode === "photo" && p.photo_status === "approved" && p.photo_path ? p.photo_path : null;

export async function loadProfile(me: Member, subjectId: string): Promise<LoadedProfile | null> {
  const sb = await createClient();
  const { data: subjectData } = await sb.from("profiles").select(PROFILE_COLS).eq("id", subjectId).maybeSingle();
  if (!subjectData) return null;
  const subject = subjectData as unknown as ProfileRow;

  const id = subject.id;
  const [links, grants, birthday, contact, household, health, logistics, skills, consents, admin, guardians, changes] =
    await Promise.all([
      sb.from("guardian_links").select("parent_id, student_id").or(`parent_id.eq.${id},student_id.eq.${id},parent_id.eq.${me.id}`),
      myGrants(sb, me.id),
      sb.from("profile_birthday").select("month, day, is_public").eq("user_id", id).maybeSingle(),
      sb.from("profile_contact").select("phone, personal_email").eq("user_id", id).maybeSingle(),
      sb.from("profile_household").select("address_line1, address_line2, city, state, zip").eq("user_id", id).maybeSingle(),
      sb.from("profile_health").select("emergency_name, emergency_relationship, emergency_phone, allergies, medical_notes").eq("user_id", id).maybeSingle(),
      sb.from("profile_logistics").select("shirt_size, transportation, other_commitments").eq("user_id", id).maybeSingle(),
      sb.from("profile_skills").select("skills").eq("user_id", id).maybeSingle(),
      sb.from("profile_consents").select("parental_permission_at, parental_permission_by, media_consent, media_consent_at, media_consent_by, contact_ack_at, contact_ack_by").eq("user_id", id).maybeSingle(),
      me.role === "lead"
        ? sb.from("profile_admin").select("first_registered, first_consent_done, ypp_status, ypp_expires, dues_paid_season, notes").eq("user_id", id).maybeSingle()
        : Promise.resolve({ data: null }),
      sb.from("profile_guardians").select("id, name, relationship, email, phone, employer").eq("student_id", id).order("sort"),
      sb.from("profile_changes").select("*").eq("subject", id).order("changed_at", { ascending: false }).limit(200),
    ]);

  const linkRows = (links.data ?? []) as { parent_id: string; student_id: string }[];
  const parentIds = linkRows.filter((l) => l.student_id === id).map((l) => l.parent_id);
  const studentIds = linkRows.filter((l) => l.parent_id === id).map((l) => l.student_id);
  const myStudents = linkRows.filter((l) => l.parent_id === me.id).map((l) => l.student_id);
  const isParentAccount = studentIds.length > 0;

  const viewer: Viewer = {
    id: me.id,
    isLead: me.role === "lead",
    isSelf: me.id === id,
    isParentOf: parentIds.includes(me.id),
    isFamily:
      parentIds.includes(me.id) ||
      studentIds.includes(me.id) ||
      (isParentAccount && studentIds.some((s) => myStudents.includes(s))),
    grants,
  };

  const values: Values = { ...(subject as unknown as Values) };
  const b = birthday.data as { month: number; day: number; is_public: boolean } | null;
  values.birthday = b ? { month: b.month, day: b.day, is_public: b.is_public } : null;
  Object.assign(values, contact.data ?? {}, household.data ?? {}, health.data ?? {}, logistics.data ?? {}, skills.data ?? {}, admin.data ?? {});
  const c = consents.data as Record<string, unknown> | null;
  if (c) {
    values.parental_permission = c.parental_permission_at ?? null;
    values.parental_permission_by = c.parental_permission_by ?? null;
    values.media_consent = c.media_consent ?? null;
    values.media_consent_at = c.media_consent_at ?? null;
    values.media_consent_by = c.media_consent_by ?? null;
    values.contact_ack = c.contact_ack_at ?? null;
    values.contact_ack_by = c.contact_ack_by ?? null;
  }

  // Linked parents and students, with whatever contact info RLS lets us read.
  const relatedIds = [...parentIds, ...studentIds];
  let parents: LinkedParent[] = [];
  let students: CardRow[] = [];
  const names: Record<string, string> = {};
  if (relatedIds.length) {
    const [{ data: cards }, { data: pc }, { data: logins }] = await Promise.all([
      sb.from("profiles").select(CARD_COLS + ", employer").in("id", relatedIds),
      sb.from("profile_contact").select("user_id, phone, personal_email").in("user_id", parentIds.length ? parentIds : ["00000000-0000-0000-0000-000000000000"]),
      sb.from("profiles").select("id, email").in("id", parentIds.length ? parentIds : ["00000000-0000-0000-0000-000000000000"]),
    ]);
    const cardRows = (cards ?? []) as unknown as (CardRow & { employer: string | null })[];
    const contactMap = new Map(((pc ?? []) as { user_id: string; phone: string | null; personal_email: string | null }[]).map((r) => [r.user_id, r]));
    const loginMap = new Map(((logins ?? []) as { id: string; email: string }[]).map((r) => [r.id, r.email]));
    // The Parents section shows contact info only to those allowed to see parent contact.
    const parentContactVisible = viewer.isSelf || viewer.isLead || viewer.isFamily ||
      canSeeField({ see: "contact" }, viewer, { isParentAccount: true, subteams: subject.subteams ?? [] });
    const addressVisible = canSeeField({ see: "address" }, viewer, { isParentAccount: false, subteams: subject.subteams ?? [] });
    parents = cardRows
      .filter((r) => parentIds.includes(r.id))
      .map((r) => {
        const ct = contactMap.get(r.id);
        return {
          card: r,
          phone: parentContactVisible ? ct?.phone ?? null : null,
          email: parentContactVisible ? ct?.personal_email || loginMap.get(r.id) || null : null,
          employer: addressVisible || viewer.isSelf || viewer.isFamily ? r.employer : null,
        };
      });
    students = cardRows.filter((r) => studentIds.includes(r.id));
  }

  const changeRows = (changes.data ?? []) as Change[];
  const editorIds = Array.from(new Set(changeRows.map((c) => c.editor).filter(Boolean) as string[]));
  const consentBy = ["parental_permission_by", "media_consent_by", "contact_ack_by"]
    .map((k) => values[k])
    .filter((x): x is string => typeof x === "string");
  const nameIds = Array.from(new Set([...editorIds, ...consentBy])).filter((x) => x !== id);
  if (nameIds.length) {
    const { data } = await sb.from("profiles").select("id, full_name, username, role, lead_title").in("id", nameIds);
    for (const p of (data ?? []) as { id: string; full_name: string; username: string }[]) names[p.id] = p.full_name || p.username;
  }
  names[id] = subject.full_name || subject.username;

  const canEdit = viewer.isSelf || viewer.isLead || viewer.isParentOf;
  const approved = shownPhotoPath(subject);
  const pending = canEdit && subject.photo_path && !approved ? subject.photo_path : null;
  const signed = await signPhotos([approved ?? "", pending ?? ""]);

  return {
    subject,
    viewer,
    isParentAccount,
    values,
    guardians: (guardians.data ?? []) as GuardianRow[],
    parents,
    students,
    changes: changeRows,
    names,
    photoUrl: approved ? signed[approved] ?? null : null,
    pendingPhotoUrl: pending ? signed[pending] ?? null : null,
  };
}

const filled = (v: unknown) =>
  v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);

/** Required fields still empty, for the completeness bar and the portal nudge. */
export function missingRequired(p: Pick<LoadedProfile, "subject" | "values" | "guardians" | "parents">): string[] {
  const role = p.subject.role;
  const out: string[] = [];
  for (const s of sectionsFor(role)) {
    for (const f of s.fields) {
      if (!f.required || !appliesTo(f.required, role)) continue;
      if (!filled(p.values[f.key])) out.push(f.short ?? f.label);
    }
  }
  if (role === "student" && p.guardians.length === 0 && p.parents.length === 0) out.push("A parent or guardian");
  return out;
}

export function requiredCount(role: ProfileRow["role"]): number {
  let n = role === "student" ? 1 : 0;
  for (const s of sectionsFor(role)) for (const f of s.fields) if (f.required && appliesTo(f.required, role)) n++;
  return n;
}

/** Lightweight check for the portal home nudge. */
export async function myMissingFields(me: Member): Promise<{ missing: string[]; total: number } | null> {
  const loaded = await loadProfile(me, me.id);
  if (!loaded) return null;
  return { missing: missingRequired(loaded), total: requiredCount(loaded.subject.role) };
}

export { SECTIONS };
