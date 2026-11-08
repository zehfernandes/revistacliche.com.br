import Link from "next/link";
import { notFound } from "next/navigation";
import { allItems, articles, podcasts, formatDate, type Item } from "@/lib/content";
import { Frame } from "@/components/Frame";
import { seo, plain, JsonLd, SITE, abs } from "@/lib/seo";

type Params = { year: string; month: string; slug: string };

export const dynamicParams = false;
export const generateStaticParams = () =>
  allItems.map((it) => {
    const [, year, month, slug] = it.path.split("/");
    return { year, month, slug };
  });

const find = async (params: Promise<Params>) => {
  const { year, month, slug } = await params;
  // Next hands non-ASCII slugs (義足のmoses) to the page percent-encoded
  return allItems.find((it) => it.path === `/${year}/${month}/${decodeURIComponent(slug)}/`) ?? notFound();
};

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const it = await find(params);
  return {
    title: it.title,
    ...seo(it.path, {
      title: it.title,
      description: plain(it.excerpt),
      image: it.cover,
      type: "article",
      publishedTime: it.date,
      authors: [it.author.name],
      tags: [...it.series, ...it.filtro],
    }),
  };
}

function jsonLd(it: Item, isPodcast: boolean) {
  const person = (p: { name: string; slug: string }) => ({ "@type": "Person", name: p.name, ...(p.slug && { url: `${SITE}/people/${p.slug}/` }) });
  return {
    "@context": "https://schema.org",
    "@type": isPodcast ? "PodcastEpisode" : "Article",
    ...(isPodcast ? { name: it.title } : { headline: it.title }),
    description: plain(it.excerpt, 300),
    url: abs(it.path),
    datePublished: it.date,
    inLanguage: "pt-BR",
    author: person(it.author),
    ...(it.cover && { image: abs(it.cover) }),
    ...(it.series.length + it.filtro.length && { keywords: [...it.series, ...it.filtro].join(", ") }),
    ...(isPodcast
      ? {
          ...(it.episode && { episodeNumber: it.episode }),
          partOfSeries: { "@type": "PodcastSeries", name: "ClicheCast", url: `${SITE}/podcasts/` },
          ...(it.audio && { associatedMedia: { "@type": "MediaObject", contentUrl: abs(it.audio) } }),
          ...(it.participants?.length && { actor: it.participants.map(person) }),
        }
      : { publisher: { "@type": "Organization", name: "Projeto Cliche", url: SITE } }),
  };
}

// excerpts are usually the first paragraph; only show a deck when it's a real summary
const startsWithExcerpt = (it: Item) =>
  it.html.replace(/<[^>]+>/g, "").replace(/&nbsp;|\s+/g, " ").trim().startsWith(it.excerpt.slice(0, 60));

// WP image file without the "-300x200" size suffix, to spot the cover repeated in the body
const base = (src: string) => src.replace(/-\d+x\d+(?=\.\w+$)/, "");

function prepare(it: Item) {
  let html = it.html;
  // the old theme showed the cover inside the post; it's the hero now, so drop the first repeat
  if (it.cover) {
    const cover = base(it.cover);
    html = html.replace(/<figure>(?:(?!<\/figure>).)*?<\/figure>|<p>(?:<a [^>]*>)?<img [^>]*>(?:<\/a>)?<\/p>/s, (m) =>
      m.match(/src="([^"]+)"/) && base(m.match(/src="([^"]+)"/)![1]) === cover ? "" : m,
    );
  }
  // big images break out of the text column
  html = html.replace(/<img ([^>]*width="(\d+)"[^>]*)>/g, (m, attrs, w) => (Number(w) >= 560 ? `<img class="wide" ${attrs}>` : m));
  return html;
}

// Shared series/filtro first, then closest in time, at most one per author so it doesn't read as "more by X".
// Pools with too few authors (podcasts) fill the rest without the cap.
function related(it: Item, pool: Item[], skip: (Item | undefined)[]) {
  const tags = [...it.series, ...it.filtro];
  const t = Date.parse(it.date);
  const ranked = pool
    .filter((o) => o.id !== it.id && !skip.includes(o))
    .map((o) => ({ o, s: [...o.series, ...o.filtro].filter((x) => tags.includes(x)).length, d: Math.abs(Date.parse(o.date) - t) }))
    .sort((a, b) => b.s - a.s || a.d - b.d)
    .map((x) => x.o);
  const authors = new Set<string>();
  const picks = ranked.filter((o) => !authors.has(o.author.name) && authors.add(o.author.name)).slice(0, 3);
  return [...picks, ...ranked.filter((o) => !picks.includes(o))].slice(0, 3);
}

export default async function Entry({ params }: { params: Promise<Params> }) {
  const it = await find(params);
  const isPodcast = it.audio !== undefined;
  const pool = isPodcast ? podcasts : articles;
  const words = it.html.replace(/<[^>]+>/g, " ").split(/\s+/).length;
  const tags = [...it.series, ...it.filtro];
  const kicker = isPodcast ? `ClicheCast${it.episode ? ` #${String(it.episode).padStart(2, "0")}` : ""}` : tags[0];
  const order = [...pool].sort((a, b) => a.date.localeCompare(b.date));
  const i = order.findIndex((o) => o.id === it.id);
  const [prev, next] = [order[i - 1], order[i + 1]];

  return (
    <Frame
      crumbs={[isPodcast ? { label: "Podcasts", href: "/podcasts/" } : { label: "Artigos", href: "/articles/" }]}
      detail={it.title}
      active={isPodcast ? "Podcasts" : "Artigos"}
      focus={it.people}
    >
      <JsonLd data={jsonLd(it, isPodcast)} />
      <article className="entry" data-pagefind-body data-pagefind-filter={`group:${isPodcast ? "ClicheCast" : "Artigos"}`} data-pagefind-meta={`note:${it.date.slice(0, 4)}`}>
        <header className="entry-head">
          {kicker && <p className="kicker">{kicker}</p>}
          <h1>{it.title}</h1>
          {!startsWithExcerpt(it) && <p className="deck">{it.excerpt}</p>}
          <dl className="byline" data-pagefind-ignore>
            <div>
              <dt>{isPodcast ? "Publicado por" : "Texto"}</dt>
              <dd>
                {it.author.slug ? <Link href={`/people/${it.author.slug}/`}>{it.author.name}</Link> : it.author.name}
              </dd>
            </div>
            {isPodcast && it.participants?.length ? (
              <div>
                <dt>Participantes</dt>
                <dd>
                  {it.participants.map((p, i) => (
                    <span key={p.slug}>
                      {i > 0 && ", "}
                      <Link href={`/people/${p.slug}/`}>{p.name}</Link>
                    </span>
                  ))}
                </dd>
              </div>
            ) : null}
            <div>
              <dt>Data</dt>
              <dd>{formatDate(it.date)}</dd>
            </div>
            <div>
              <dt>{isPodcast ? "Duração" : "Leitura"}</dt>
              <dd>{isPodcast ? it.duration ?? "—" : `${Math.max(1, Math.round(words / 200))} min`}</dd>
            </div>
          </dl>
        </header>

        {isPodcast ? (
          <div className="entry-audio">
            {it.audio ? <audio controls preload="none" src={it.audio} /> : <p>Áudio disponível na versão completa do arquivo.</p>}
          </div>
        ) : (
          it.cover && (
            <figure className="entry-cover">
              <img src={it.cover} alt="" />
            </figure>
          )
        )}

        <div className="entry-body">
          <aside className="entry-rail" data-pagefind-ignore>
            {it.sections.length > 0 && (
              <nav>
                <h2>Neste texto</h2>
                <ol>
                  {it.sections.map((s) => (
                    <li key={s.id}>
                      <a href={`#${s.id}`}>{s.label}</a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
            {tags.length > 0 && (
              <div className="entry-tags">
                {tags.map((s) => (
                  <Link key={s} className="pill" href={`/articles/?filter=${encodeURIComponent(s)}`}>
                    {s}
                  </Link>
                ))}
              </div>
            )}
          </aside>
          <div className="prose" dangerouslySetInnerHTML={{ __html: prepare(it) }} />
        </div>

        <footer className="entry-foot" data-pagefind-ignore>
          <h2>Leia também</h2>
          <ul className="cards">
            {related(it, pool, [prev, next]).map((o) => (
              <li key={o.id}>
                <Link href={o.path}>
                  <span className="card-img">{o.cover && <img src={o.cover} alt="" loading="lazy" />}</span>
                  <span className="card-kicker">{o.series[0] ?? o.filtro[0] ?? formatDate(o.date)}</span>
                  <span className="card-title">{o.title}</span>
                </Link>
              </li>
            ))}
          </ul>
          <nav className="prevnext">
            {prev ? (
              <Link href={prev.path}>
                <span>← Anterior</span>
                {prev.title}
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link href={next.path}>
                <span>Próximo →</span>
                {next.title}
              </Link>
            )}
          </nav>
        </footer>
      </article>
    </Frame>
  );
}
