import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Backup server-side sign-out route; the dashboard button uses the browser
// SDK and this is here only so an older /portal/signout link still works.
export async function POST(request: Request) {
  const sb = await createClient();
  await sb.auth.signOut();
  return NextResponse.redirect(new URL("/portal/login?signedout=1", request.url));
}

export async function GET(request: Request) {
  return POST(request);
}
