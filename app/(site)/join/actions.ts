"use server";
import { after } from "next/server";
import { isKind } from "@/lib/recruiting";
import { FORM_SPECS } from "@/lib/recruiting-forms";
import { notifyNewInquiry, recordInquiry } from "@/lib/recruiting-server";

export interface JoinFormState {
  ok?: boolean;
  error?: string;
}

export async function submitJoinForm(_prev: JoinFormState, formData: FormData): Promise<JoinFormState> {
  // Honeypot: real people never see or fill this field.
  if (String(formData.get("website") ?? "").trim()) return { ok: true };

  const kind = String(formData.get("kind") ?? "");
  if (!isKind(kind)) return { error: "Unknown form." };
  const spec = FORM_SPECS[kind];

  const details: Record<string, string> = {};
  const std: Record<string, string> = {};
  for (const f of spec.fields) {
    const v = String(formData.get(f.name) ?? "").trim().slice(0, 5000);
    if (f.required && !v) return { error: `Please fill in "${f.label}".` };
    if (f.type === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return { error: `"${f.label}" doesn't look like an email address.` };
    if (v) details[f.label] = v;
    if (f.std) std[f.std] = v;
  }

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
