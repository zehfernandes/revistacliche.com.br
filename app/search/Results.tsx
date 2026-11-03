"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Hit = { url: string; title: string; group: string; note?: string; image?: string; excerpt: string };

// The Pagefind index is written by `npm run build` (pagefind --site out) and served from /pagefind/.
const PAGEFIND = "/pagefind/pagefind.js";

async function search(query: string): Promise<Hit[]> {
  const pagefind = await import(/* webpackIgnore: true */ PAGEFIND);
  const { results } = await pagefind.search(query);
  const data = await Promise.all(results.slice(0, 60).map((r: { data: () => Promise<any> }) => r.data()));
  return data.map((d) => ({ url: d.url, title: d.meta.title, group: d.filters.group?.[0] ?? "Outros", note: d.meta.note, image: d.meta.image, excerpt: d.excerpt }));
}

export function Results() {
  const query = useSearchParams().get("q")?.trim() ?? "";
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!query) return;
    setHits(null);
    search(query).then(setHits, () => setFailed(true));
  }, [query]);

  if (!query) return <p className="empty">Digite na barra abaixo para buscar pessoas, artigos e episódios.</p>;
  if (failed) return <p className="empty">O índice de busca ainda não existe. Rode “npm run build”.</p>;
  if (!hits) return <p className="empty">Buscando…</p>;
  if (!hits.length) return <p className="empty">Nada encontrado para “{query}”.</p>;

  // relevance order inside each group, groups in order of their best hit
  const groups = [...new Set(hits.map((h) => h.group))];
  const rows = groups.flatMap((g) => hits.filter((h) => h.group === g));
  return (
    <div className="archive search">
      <div className="archive-head">
        <p>
          <strong>“{query}”</strong> · {hits.length} {hits.length === 1 ? "resultado" : "resultados"}
        </p>
      </div>
      <table>
        <thead>
          <tr>
            <th className="thumb" aria-hidden />
            <th className="title">Título</th>
            <th className="wide">Tipo</th>
            <th className="muted num date">Nota</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((h) => (
            <tr key={h.url}>
              <td className="thumb">{h.image && <img src={h.image} alt="" loading="lazy" onError={(e) => (e.currentTarget.hidden = true)} />}</td>
              <td className="title">
                <a href={h.url} className="row-link">
                  {h.title}
                </a>
                {h.group !== "Pessoas" && <p className="snippet" dangerouslySetInnerHTML={{ __html: h.excerpt }} />}
              </td>
              <td className="wide">{h.group}</td>
              <td className="muted num date">{h.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
