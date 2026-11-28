"use server";
import { after } from "next/server";
import { isKind } from "@/lib/recruiting";
import { FORM_SPECS, OTHER, isShown } from "@/lib/recruiting-forms";
import { notifyNewInquiry, recordInquiry } from "@/lib/recruiting-server";

export interface JoinFormState {
  ok?: boolean;
  error?: string;
  /** The question the error is about, so the form can jump to it. */
  field?: string;
}

export async function submitJoinForm(_prev: JoinFormState, formData: FormData): Promise<JoinFormState> {
  // Honeypot: real people never see or fill this field.
  if (String(formData.get("website") ?? "").trim()) return { ok: true };

  const kind = String(formData.get("kind") ?? "");
  if (!isKind(kind)) return { error: "Unknown form." };
  const spec = FORM_SPECS[kind];

  const details: Record<string, string> = {};
  const std: Record<string, string> = {};
  const clip = (x: unknown) => String(x ?? "").trim().slice(0, 5000);
  for (const f of spec.fields) {
    if (!isShown(f, (n) => String(formData.get(n) ?? ""))) continue;
    let v: string;
    if (f.type === "checkboxes") {
      const picked: string[] = [];
      for (const raw of formData.getAll(f.name).map(clip)) {
        if (raw === OTHER) {
          const other = clip(formData.get(`${f.name}__other`));
          if (!other) return { field: f.name, error: `Please fill in the "Other" answer for "${f.label}".` };
          picked.push(`Other: ${other}`);
        } else if (f.options?.includes(raw)) picked.push(raw);
      }
      if (f.required && picked.length === 0) return { field: f.name, error: `Please pick at least one answer for "${f.label}".` };
      v = picked.join("; ");
    } else if (f.type === "radio" || f.type === "select") {
      const raw = clip(formData.get(f.name));
      if (raw === OTHER && f.other) {
        const other = clip(formData.get(`${f.name}__other`));
        if (!other) return { field: f.name, error: `Please fill in the "Other" answer for "${f.label}".` };
        v = `Other: ${other}`;
      } else v = f.options?.includes(raw) ? raw : "";
      if (f.required && !v) return { field: f.name, error: `Please answer "${f.label}".` };
    } else if (f.type === "consent") {
      v = formData.get(f.name) === "on" ? "Agreed" : "";
      if (f.required && !v) return { field: f.name, error: `Please tick the "${f.label}" box.` };
    } else {
      v = clip(formData.get(f.name));
      if (f.required && !v) return { field: f.name, error: `Please fill in "${f.label}".` };
      if (f.type === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return { field: f.name, error: `"${f.label}" doesn't look like an email address.` };
    }
    if (v) details[f.label] = v;
    if (f.std) std[f.std] = v;
  }
  if (!std.name && (std.firstName || std.lastName)) std.name = [std.firstName, std.lastName].filter(Boolean).join(" ");

  const result = await recordInquiry({
    kind,
    source: "native",
    name: std.name ?? "",
    email: std.email ?? "",
    phone: std.phone || null,
    organization: std.organization || null,
    message: std.message || null,
    details,
  });
  if (!result.ok) {
    console.error("[join] insert failed", result.error);
    return { error: "Sorry, something went wrong saving your form. Please try again, or DM us on Instagram @frc_platypirates." };
  }
  after(() => notifyNewInquiry(result.id, result.inquiry));
  return { ok: true };
}

const INTEREST_KIND: Record<string, "student" | "mentor" | "sponsor" | "other"> = {
  "Joining as a student": "student",
  Mentoring: "mentor",
  Sponsoring: "sponsor",
};

/** The general "Send us a message" form on /join. */
export async function submitContactForm(_prev: JoinFormState, formData: FormData): Promise<JoinFormState> {
  if (String(formData.get("website") ?? "").trim()) return { ok: true };
  const name = String(formData.get("name") ?? "").trim().slice(0, 200);
  const email = String(formData.get("email") ?? "").trim().slice(0, 320);
  const interest = String(formData.get("interest") ?? "").trim().slice(0, 100);
  const message = String(formData.get("message") ?? "").trim().slice(0, 5000);
  if (!name || !email) return { error: "Please add your name and email." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "That email address doesn't look right." };

  const details: Record<string, string> = { Name: name, Email: email, "Interested in": interest };
  if (message) details.Message = message;
  const result = await recordInquiry({
    kind: INTEREST_KIND[interest] ?? "other",
    source: "native",
    name,
    email,
    message: message || null,
    details,
  });
  if (!result.ok) {
    console.error("[join] contact insert failed", result.error);
    return { error: "Sorry, something went wrong. Please try again, or DM us on Instagram @frc_platypirates." };
  }
  after(() => notifyNewInquiry(result.id, result.inquiry));
  return { ok: true };
}
