import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import NativeJoinForm from "@/components/NativeJoinForm";
import { Card, PageHero, Section } from "@/components/ui";
import { KINDS, isKind } from "@/lib/recruiting";
import { FORM_SPECS } from "@/lib/recruiting-forms";

export function generateStaticParams() {
  return KINDS.map((kind) => ({ kind }));
}

export async function generateMetadata({ params }: { params: Promise<{ kind: string }> }): Promise<Metadata> {
  const { kind } = await params;
  if (!isKind(kind)) return {};
  return { title: FORM_SPECS[kind].title, description: FORM_SPECS[kind].intro };
}

export default async function JoinKindPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!isKind(kind)) notFound();
  const spec = FORM_SPECS[kind];
  return (
    <>
      <PageHero eyebrow={spec.eyebrow} title={spec.title}>
        {spec.intro}
      </PageHero>
      <Section>
        <div className="mx-auto max-w-[640px]">
          <Card>
            <NativeJoinForm kind={kind} spec={spec} />
          </Card>
          <p className="mt-5 text-center text-[0.9rem]">
            <Link href="/join">← Back to Join Us</Link>
          </p>
        </div>
      </Section>
    </>
  );
}
