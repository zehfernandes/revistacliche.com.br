import { existsSync } from "node:fs";
import { notFound } from "next/navigation";
import { volumes } from "@/lib/content";
import { Frame } from "@/components/Frame";
import { SpreadViewer } from "@/components/SpreadViewer";

export const dynamicParams = false;
export const generateStaticParams = () => volumes.map((v) => ({ n: v.n }));

export async function generateMetadata({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  return { title: n.toUpperCase() };
}

export default async function Volume({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const v = volumes.find((v) => v.n === n) ?? notFound();
  // cover alone, then facing pages (2–3, 4–5…), back cover alone when the count is even
  const spreads = Array.from({ length: Math.floor(v.pages / 2) + 1 }, (_, i) => (i ? [i * 2, i * 2 + 1].filter((p) => p <= v.pages) : [1]));
  return (
    <Frame
      crumbs={[{ label: "Volumes", href: "/volumes/" }, { label: [v.label, v.year].filter(Boolean).join(", ") }]}
      detail={v.theme ?? "Sumário"}
      active="Volumes"
    >
      {v.scans ? (
        <SpreadViewer spreads={spreads} scans={v.scans} hires={existsSync(`public${v.scans}/p-01-2x.jpg`)} />
      ) : (
        <p className="empty">Estamos buscando o arquivo...</p>
      )}
    </Frame>
  );
}
