import { seo } from "@/lib/seo";
import Link from "next/link";
import { talks } from "@/lib/content";
import { Frame } from "@/components/Frame";

export const metadata = { title: "Palestras", ...seo("/talks/", { title: "Palestras e oficinas", description: `As ${talks.length} palestras e oficinas da Revista Cliche em eventos de design (2012–2014), com os slides.` }) };

export default function Talks() {
  return (
    <Frame crumbs={[{ label: "Palestras" }]} active="Palestras">
      <div className="archive volumes talks">
        <div className="archive-head">
          <p>
            <strong>Palestras e oficinas</strong> · {talks.length} apresentações em eventos de design
          </p>
        </div>
        <table>
          <thead>
            <tr>
              <th className="cover-col" aria-hidden />
              <th>Título</th>
              <th className="theme">Onde</th>
              <th className="pages">Slides</th>
              <th className="date">Ano</th>
            </tr>
          </thead>
          <tbody>
            {talks.map((t) => (
              <tr key={t.slug}>
                <td className="cover-col">
                  {t.slides ? <img className="cover" src={`/talks/${t.slug}/p-01-sm.jpg`} alt="" width={600} height={450} decoding="async" /> : <span className="cover">?</span>}
                </td>
                <td className="title">
                  <Link href={`/talks/${t.slug}/`} className="row-link">
                    {t.title}
                  </Link>
                  <span className="kind muted">{t.kind}</span>
                </td>
                <td className="theme muted">{t.where ?? "—"}</td>
                <td className="pages muted num">{t.slides || "?"}</td>
                <td className="date muted num">{t.year}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Frame>
  );
}
