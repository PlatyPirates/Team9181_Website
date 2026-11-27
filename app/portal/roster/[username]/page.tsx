import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireMember, type Member } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { loadProfile } from "@/lib/profile-server";
import ProfileView from "@/components/profile/ProfileView";

export const metadata: Metadata = { title: "Member profile" };

export default async function MemberProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { username } = await params;
  const me = await requireMember(`/portal/roster/${username}`);
  const tab = (await searchParams).tab === "history" ? "history" : "profile";
  return (
    <main className="mx-auto max-w-[1200px] px-6 py-10">
      <Link href="/portal/roster" className="mb-6 inline-block font-mono text-xs uppercase tracking-[0.14em] text-[color:var(--p-accent)] hover:text-[color:var(--p-accent-strong)]">
        ← Crew Roster
      </Link>
      <Suspense fallback={<p className="text-[color:var(--p-text-muted)]">Loading profile…</p>}>
        <MemberBody me={me} username={decodeURIComponent(username).toLowerCase()} tab={tab} />
      </Suspense>
    </main>
  );
}

async function MemberBody({ me, username, tab }: { me: Member; username: string; tab: "profile" | "history" }) {
  if (username === me.username) redirect(tab === "history" ? "/portal/profile?tab=history" : "/portal/profile");
  const sb = await createClient();
  const { data } = await sb.from("profiles").select("id").eq("username", username).maybeSingle();
  const loaded = data ? await loadProfile(me, data.id) : null;
  if (!loaded) {
    return (
      <p className="rounded border border-dashed border-[color:var(--p-border-strong)] p-8 text-center text-[color:var(--p-text-muted)]">
        No member called @{username}.
      </p>
    );
  }
  return <ProfileView me={me} p={loaded} tab={tab} basePath={`/portal/roster/${loaded.subject.username}`} />;
}
