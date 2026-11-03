// Builds the Pagefind search index: every page of the static export, plus one record per piece of the
// printed issues (its pages' text from content/volume-text.json), linked to its spread in the volume viewer.
import { readFileSync, existsSync } from "node:fs";
import * as pagefind from "pagefind";

const read = (f) => (existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : {});
const { volumes } = read("content/volumes.json");
const text = read("content/volume-text.json");

const { index } = await pagefind.createIndex();
const { errors, page_count } = await index.addDirectory({ path: "out" });
if (errors.length) throw new Error(errors.join("\n"));

let records = 0;
for (const v of volumes) {
  const pages = text[v.n] ?? [];
  const contents = v.contents.filter((c) => c.page).sort((a, b) => a.page - b.page);
  // a piece runs until the next one starts
  const pieces = contents.length ? contents.map((c, i) => ({ ...c, end: (contents[i + 1]?.page ?? pages.length + 1) - 1 })) : v.contents;
  for (const c of pieces) {
    if (c.search === false) continue;
    const credits = [...(c.authors ?? []), ...(c.illustrators ?? [])].join(", ");
    const body = c.page ? pages.slice(c.page - 1, c.end).join(" ") : "";
    await index.addCustomRecord({
      url: c.page ? `/volumes/${v.n}/#${Math.floor(c.page / 2) + 1}` : `/volumes/${v.n}/`,
      content: [c.title, credits, body].filter(Boolean).join(". "),
      language: "pt-br",
      meta: { title: c.title, note: c.page ? `${v.label} · p. ${c.page}` : v.label },
      filters: { group: ["Revista"] },
    });
    records++;
  }
}

await index.writeFiles({ outputPath: "out/pagefind" });
await pagefind.close();
console.log(`pagefind: ${page_count} pages + ${records} pieces of the printed issues`);
