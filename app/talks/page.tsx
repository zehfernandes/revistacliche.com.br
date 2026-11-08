import { seo } from "@/lib/seo";
import Link from "next/link";
import { talks } from "@/lib/content";
import { Frame } from "@/components/Frame";

export const metadata = { title: "Palestras", ...seo("/talks/", { title: "Palestras e oficinas", description: `As ${talks.length} palestras e oficinas da Revista Cliche em eventos de design (2012–2014), com os slides.` }) };

export default function Talks() {
  return (
    <Frame crumbs={[{ label: "Palestras" }]} active="Palestras">
      <div className="archive">
        <div className="archive-head">
          <p>
            <strong>Palestras e oficinas</strong> · {talks.length} apresentações em eventos de design
          </p>
        </div>
        <table>
          <thead>
            <tr>
              <th className="thumb" aria-hidden />
              <th className="title">Título</th>
              <th className="wide">Tipo</th>
              <th className="wide where">Onde</th>
              <th className="ep">Slides</th>
              <th className="date">Ano</th>
            </tr>
          </thead>
          <tbody>
            {talks.map((t) => (
              <tr key={t.slug}>
                <td className="thumb">{t.slides > 0 && <img src={`/talks/${t.slug}/p-01-sm.jpg`} alt="" loading="lazy" />}</td>
                <td className="title">
                  <Link href={`/talks/${t.slug}/`} className="row-link">
                    {t.title}
                  </Link>
                </td>
                <td className="muted wide">{t.kind}</td>
                <td className="muted wide where">{t.where ?? "—"}</td>
                <td className="muted num ep">{t.slides || "—"}</td>
                <td className="muted num date">{t.year}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Frame>
  );
}
