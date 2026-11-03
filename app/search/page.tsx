import { Suspense } from "react";
import { Frame } from "@/components/Frame";
import { Results } from "./Results";

export const metadata = { title: "Busca" };

export default function Search() {
  return (
    <Frame crumbs={[{ label: "Busca" }]}>
      <Suspense>
        <Results />
      </Suspense>
    </Frame>
  );
}
