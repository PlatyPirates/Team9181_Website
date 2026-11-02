"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export interface SignupState { error?: string }

const usernameRe = /^[a-z0-9](?:[a-z0-9._-]{1,30})[a-z0-9]$/;

export async function signupAction(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const full_name = String(formData.get("full_name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!full_name || !username || !email || !password)
    return { error: "Fill in every field." };
  if (!usernameRe.test(username))
    return { error: "Username: 3–32 chars, letters/numbers/._- only." };
  if (password.length < 8)
    return { error: "Password must be at least 8 characters." };

  const sb = await createClient();
  const { error } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: { full_name, username },
      emailRedirectTo: undefined,
    },
  });
  if (error) return { error: error.message };

  // Trigger created a 'pending' profile. Session is now set; show the hold page.
  redirect("/portal/pending");
}
