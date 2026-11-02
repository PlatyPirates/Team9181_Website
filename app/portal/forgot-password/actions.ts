"use server";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";

export interface ForgotState { ok?: boolean; error?: string }

export async function forgotAction(_prev: ForgotState, formData: FormData): Promise<ForgotState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  if (!identifier) return { error: "Enter your username or email." };
  const sb = await createClient();
  const { data: email } = await sb.rpc("email_for_login", { identifier });
  // Don't leak whether the account exists — always say "check your email".
  if (!email) return { ok: true };
  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host") ?? ""}`;
  await sb.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/portal/reset-password` });
  return { ok: true };
}
