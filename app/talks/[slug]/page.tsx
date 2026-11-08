import { seo } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { talks } from "@/lib/content";
import { Frame } from "@/components/Frame";
import { SpreadViewer } from "@/components/SpreadViewer";

export const dynamicParams = false;
export const generateStaticParams = () => talks.map((t) => ({ slug: t.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = talks.find((t) => t.slug === slug)!;
  return {
    title: t.title,
    ...seo(`/talks/${t.slug}/`, {
      title: t.title,
      description: `${t.kind} da Revista Cliche${t.where ? ` em ${t.where}` : ""}, ${t.year}.${t.slides ? ` ${t.slides} slides.` : ""}`,
      ...(t.slides && { image: `/talks/${t.slug}/p-01.jpg` }),
    }),
    ...(!t.slides && { robots: { index: false } }), // no deck yet: nothing to index
  };
}

export default async function Talk({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = talks.find((t) => t.slug === slug) ?? notFound();
  return (
    <Frame
      crumbs={[{ label: "Palestras", href: "/talks/" }, { label: t.title }]}
      detail={[t.where, t.year].filter(Boolean).join(", ")}
      active="Palestras"
    >
      {t.slides ? (
        <SpreadViewer slides spreads={Array.from({ length: t.slides }, (_, i) => [i + 1])} scans={`/talks/${t.slug}`} />
      ) : (
        <p className="empty">
          Estamos buscando os slides...{t.post && <> Enquanto isso, <Link href={t.post}>leia o post</Link>.</>}
        </p>
      )}
    </Frame>
  );
}
