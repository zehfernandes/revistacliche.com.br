import Link from "next/link";
import { volumes } from "@/lib/content";
import { Frame } from "@/components/Frame";

export const metadata = { title: "Volumes" };

export default function Volumes() {
  return (
    <Frame crumbs={[{ label: "Volumes" }]} active="Volumes">
      <div className="archive volumes">
        <div className="archive-head">
          <p>
            <strong>Revista Cliche</strong> · {volumes.length} edições impressas
          </p>
        </div>
        <table>
          <thead>
            <tr>
              <th className="cover-col" aria-hidden />
              <th>Edição</th>
              <th className="theme">Tema</th>
              <th className="pages">Páginas</th>
              <th className="date">Ano</th>
            </tr>
          </thead>
          <tbody>
            {volumes.map((v) => (
              <tr key={v.n}>
                <td className="cover-col">
                  {v.scans && v.cover ? <img className="cover" src={v.cover} alt={`Revista Cliche ${v.label}`} width={800} height={800} decoding="async" /> : <span className="cover">?</span>}
                </td>
                <td className="title">
                  <Link href={`/volumes/${v.n}/`} className="row-link">
                    {v.label}
                  </Link>
                </td>
                <td className="theme muted">{v.theme ?? "—"}</td>
                <td className="pages muted num">{v.scans ? v.pages : "?"}</td>
                <td className="date muted num">{v.year ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Frame>
  );
}
