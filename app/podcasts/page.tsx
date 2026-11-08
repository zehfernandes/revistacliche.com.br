import { seo } from "@/lib/seo";
import { podcasts, rows } from "@/lib/content";
import { Frame } from "@/components/Frame";
import { ArchiveTable } from "@/components/ArchiveTable";

export const metadata = { title: "Podcasts", ...seo("/podcasts/", { title: "ClicheCast", description: `Os ${podcasts.length} episódios do ClicheCast, o podcast da Revista Cliche sobre design (2012–2015).` }) };

export default function Podcasts() {
  return (
    <Frame
      crumbs={[{ label: "Podcasts" }]}
      detail="ClicheCast"
      active="Podcasts"
    >
      <ArchiveTable kind="podcasts" items={rows(podcasts)} label="ClicheCast" />
    </Frame>
  );
}
