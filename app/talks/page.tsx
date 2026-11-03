import { Frame } from "@/components/Frame";

export const metadata = { title: "Palestras" };

export default function Talks() {
  return (
    <Frame crumbs={[{ label: "Palestras" }]} active="Palestras">
      <p className="empty">Em breve.</p>
    </Frame>
  );
}
