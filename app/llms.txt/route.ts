import { articles, podcasts, people, talks, volumes, formatDate, type Item } from "@/lib/content";
import { abs, plain } from "@/lib/seo";

// The llmstxt.org index: what the archive is and a link to every page, so agents don't have to crawl the tables.
export const dynamic = "force-static";

// brackets in a title ("O [re] Design…") would end the markdown link text
const esc = (s: string) => s.replace(/[[\]]/g, "\\$&");
const link = (it: Item) => `- [${esc(it.title)}](${abs(it.path)}): ${formatDate(it.date)}, ${it.author.name}. ${plain(it.excerpt, 200)}`;
const newest = (items: Item[]) => [...items].sort((a, b) => b.date.localeCompare(a.date));

export function GET() {
  const body = [
    "# Revista Cliche",
    "",
    "> Arquivo da Revista Cliche, revista colaborativa e independente sobre design criada por estudantes da UTFPR em Curitiba. Reúne as edições impressas (2010–2015), os artigos do site (2011–2015) e o podcast ClicheCast (2012–2015). Conteúdo em português do Brasil.",
    "",
    `Cada página de artigo traz o texto completo; as páginas das edições impressas trazem o texto extraído dos scans, página por página. Feeds RSS: ${abs("/feed/")} (artigos) e ${abs("/feed/podcast/")} (podcast). Mapa do site: ${abs("/sitemap.xml")}. Grafo de pessoas e textos em JSON: ${abs("/people-graph.json")}.`,
    "",
    "## Edições impressas",
    "",
    ...volumes.filter((v) => v.scans).map((v) => `- [Revista Cliche ${v.label}${v.theme ? `: ${v.theme}` : ""}](${abs(`/volumes/${v.n}/`)}): ${[v.year, `${v.pages} páginas`].filter(Boolean).join(", ")}. ${v.contents.map((c) => c.title).join("; ")}`),
    "",
    "## Palestras e oficinas",
    "",
    ...talks.filter((t) => t.slides).map((t) => `- [${esc(t.title)}](${abs(`/talks/${t.slug}/`)}): ${t.kind}${t.where ? `, ${t.where}` : ""}, ${t.year}. ${t.slides} slides (imagens).`),
    "",
    "## Artigos",
    "",
    ...newest(articles).map(link),
    "",
    "## ClicheCast",
    "",
    ...newest(podcasts).map(link),
    "",
    "## Optional",
    "",
    `- [Sobre a revista](${abs("/")})`,
    ...people.map((p) => `- [${esc(p.name)}](${abs(`/people/${p.slug}/`)}): ${p.items.length} ${p.items.length === 1 ? "referência" : "referências"}`),
    "",
  ].join("\n");
  return new Response(body, { headers: { "content-type": "text/markdown; charset=utf-8" } });
}
