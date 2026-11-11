import { after, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/utils/supabase/admin";
import { extractStandardFields, inferKind, isKind, type InquiryKind } from "@/lib/recruiting";
import { notifyNewInquiry, recordInquiry } from "@/lib/recruiting-server";

/**
 * Receives Google Form responses from the Apps Script on the response Sheet
 * (see /portal/recruiting/settings). Body:
 *   { secret, kind: "student"|"mentor"|"sponsor"|"auto", responseId, submittedAt, answers: { question: answer } }
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body must be JSON." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: row } = await admin.from("recruiting_secret").select("secret").eq("id", 1).maybeSingle();
  const expected = Buffer.from(String(row?.secret ?? ""));
  const given = Buffer.from(String(body.secret ?? ""));
  if (!expected.length || expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return NextResponse.json({ ok: false, error: "Wrong or missing secret. Copy a fresh script from Recruiting → Settings." }, { status: 401 });
  }

  const rawAnswers = (body.answers ?? {}) as Record<string, unknown>;
  const answers: Record<string, string> = {};
  for (const [q, a] of Object.entries(rawAnswers).slice(0, 100)) {
    const v = Array.isArray(a) ? a.join(", ") : String(a ?? "");
    answers[String(q).slice(0, 300)] = v.slice(0, 5000);
  }
  if (Object.keys(answers).length === 0) {
    return NextResponse.json({ ok: false, error: "No answers in the response." }, { status: 400 });
  }

  const kind: InquiryKind = isKind(body.kind) ? body.kind : inferKind(answers);
  const std = extractStandardFields(answers);

  const result = await recordInquiry({
    kind,
    source: "google",
    externalId: body.responseId ? `google:${String(body.responseId).slice(0, 200)}` : null,
    ...std,
    details: answers,
    submittedAt: typeof body.submittedAt === "string" ? body.submittedAt : null,
  });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 });

  // Backfilled old rows (body.notify === false) and repeats don't ping anyone.
  if (!result.duplicate && body.notify !== false) {
    after(() => notifyNewInquiry(result.id, result.inquiry));
  }
  return NextResponse.json({ ok: true, id: result.id, duplicate: result.duplicate });
}
