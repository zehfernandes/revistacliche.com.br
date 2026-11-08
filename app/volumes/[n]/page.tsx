import { seo, plain, abs, JsonLd } from "@/lib/seo";
import volumeText from "@/content/volume-text.json";
import { existsSync } from "node:fs";
import { notFound } from "next/navigation";
import { volumes } from "@/lib/content";
import { Frame } from "@/components/Frame";
import { SpreadViewer } from "@/components/SpreadViewer";

export const dynamicParams = false;
export const generateStaticParams = () => volumes.map((v) => ({ n: v.n }));

export async function generateMetadata({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const v = volumes.find((v) => v.n === n)!;
  const title = [`Revista Cliche ${v.label}`, v.theme].filter(Boolean).join(": ");
  return {
    title: v.label,
    ...seo(`/volumes/${v.n}/`, {
      title,
      description: plain(`${title}${v.year ? ` (${v.year})` : ""}. ${v.pages} páginas digitalizadas. Sumário: ${v.contents.map((c) => c.title).join("; ")}`, 300),
    }),
  };
}

type V = (typeof volumes)[number];
const credits = (c: V["contents"][number]) => [...(c.authors ?? []), ...(c.illustrators ?? [])].join(", ");

function jsonLd(v: V) {
  return {
    "@context": "https://schema.org",
    "@type": "PublicationIssue",
    name: [`Revista Cliche ${v.label}`, v.theme].filter(Boolean).join(": "),
    issueNumber: v.n.slice(1),
    url: abs(`/volumes/${v.n}/`),
    ...(v.year && { datePublished: v.year }),
    ...(v.cover && { image: abs(v.cover) }),
    numberOfPages: v.pages,
    inLanguage: "pt-BR",
    isPartOf: { "@type": "Periodical", name: "Revista Cliche", url: abs("/") },
    hasPart: v.contents.map((c) => ({
      "@type": "CreativeWork",
      name: c.title,
      ...(c.page && { pageStart: c.page, url: abs(`/volumes/${v.n}/#${Math.floor(c.page / 2) + 1}`) }),
      ...(credits(c) && { author: [...(c.authors ?? []), ...(c.illustrators ?? [])].map((name) => ({ "@type": "Person", name })) }),
    })),
  };
}

// The scans' text (scripts/extract_pdfs.py), page by page under the titles of the pieces that start there.
// Visually hidden: the viewer fills the screen, but screen readers, search engines and agents can't read a scan.
function Transcript({ v, pages }: { v: V; pages: string[] }) {
  if (!pages.some(Boolean)) return null;
  return (
    <div className="sr-only">
      <h1>{[`Revista Cliche ${v.label}`, v.theme].filter(Boolean).join(": ")} — texto da edição</h1>
      {pages.map((text, i) => {
        const p = i + 1;
        const starts = v.contents.filter((c) => c.page === p);
        if (!starts.length && !text) return null;
        return (
          <section key={p}>
            {starts.map((c) => (
              <hgroup key={c.title}>
                <h2>{c.title}</h2>
                {credits(c) && <p>{credits(c)}</p>}
              </hgroup>
            ))}
            {text && (
              <p>
                [p. {p}] {text}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
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
      <JsonLd data={jsonLd(v)} />
      {v.scans ? (
        <SpreadViewer spreads={spreads} scans={v.scans} hires={existsSync(`public${v.scans}/p-01-2x.jpg`)} />
      ) : (
        <p className="empty">Estamos buscando o arquivo...</p>
      )}
      <Transcript v={v} pages={(volumeText as Record<string, string[]>)[v.n] ?? []} />
    </Frame>
  );
}
