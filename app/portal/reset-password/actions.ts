"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export interface ResetState { error?: string }

export async function resetAction(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  const sb = await createClient();
  const { data: userData } = await sb.auth.getUser();
  if (!userData.user) return { error: "This reset link has expired. Request a new one." };
  const { error } = await sb.auth.updateUser({ password });
  if (error) return { error: error.message };
  redirect("/portal");
}
