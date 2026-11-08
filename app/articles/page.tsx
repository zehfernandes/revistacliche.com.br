import { seo } from "@/lib/seo";
import { articles, rows, volumeItems } from "@/lib/content";
import { Frame } from "@/components/Frame";
import { ArchiveTable } from "@/components/ArchiveTable";

export const metadata = { title: "Artigos", ...seo("/articles/", { title: "Artigos", description: `Todos os ${articles.length} artigos publicados no site da Revista Cliche entre 2011 e 2015: design digital, gráfico, de moda, de produto, entrevistas e animação.` }) };

export default function Articles() {
  return (
    <Frame crumbs={[{ label: "Artigos" }]} active="Artigos">
      <ArchiveTable kind="articles" items={rows([...articles, ...volumeItems])} label="Artigos" />
    </Frame>
  );
}
