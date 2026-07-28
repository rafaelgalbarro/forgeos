import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DOC_ARTICLES } from "@/lib/launch";
import { DocsHub } from "@/components/launch/DocsHub";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return DOC_ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = DOC_ARTICLES.find((a) => a.slug === slug);
  if (!article) return { title: "Docs — ForgeOS" };
  return {
    title: `${article.title} — ForgeOS Docs`,
    description: article.summary,
  };
}

export default async function DocSlugRoute({ params }: Props) {
  const { slug } = await params;
  const article = DOC_ARTICLES.find((a) => a.slug === slug);
  if (!article) notFound();
  return <DocsHub activeSlug={slug} />;
}
