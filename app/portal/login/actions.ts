"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export interface LoginState { error?: string }

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/portal");
  if (!identifier || !password) return { error: "Enter your username or email and password." };

  const sb = await createClient();
  // Resolve to an email, whether they typed a username or an email.
  const { data: emailData, error: lookupErr } = await sb.rpc("email_for_login", { identifier });
  if (lookupErr) return { error: "Could not reach the server. Try again." };
  const email: string | null = emailData ?? null;
  if (!email) return { error: "No account found with that username or email." };

  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { error: "Wrong password." };

  redirect(next.startsWith("/portal") ? next : "/portal");
}
