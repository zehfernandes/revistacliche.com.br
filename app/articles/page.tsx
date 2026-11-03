import { articles, rows, volumeItems } from "@/lib/content";
import { Frame } from "@/components/Frame";
import { ArchiveTable } from "@/components/ArchiveTable";

export const metadata = { title: "Artigos" };

export default function Articles() {
  return (
    <Frame crumbs={[{ label: "Artigos" }]} active="Artigos">
      <ArchiveTable kind="articles" items={rows([...articles, ...volumeItems])} label="Artigos" />
    </Frame>
  );
}
