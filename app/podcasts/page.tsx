import { podcasts, rows } from "@/lib/content";
import { Frame } from "@/components/Frame";
import { ArchiveTable } from "@/components/ArchiveTable";

export const metadata = { title: "Podcasts" };

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
