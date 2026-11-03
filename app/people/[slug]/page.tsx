import Link from "next/link";
import { notFound } from "next/navigation";
import { allItems, people, rows, volumeItems } from "@/lib/content";
import { Frame } from "@/components/Frame";
import { ArchiveTable } from "@/components/ArchiveTable";

export const dynamicParams = false;
export const generateStaticParams = () => people.map((p) => ({ slug: p.slug }));

const find = async (params: Promise<{ slug: string }>) => {
  const { slug } = await params;
  return people.find((p) => p.slug === slug) ?? notFound();
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return { title: (await find(params)).name };
}

export default async function Person({ params }: { params: Promise<{ slug: string }> }) {
  const person = await find(params);
  const paths = new Set(person.items.map((i) => i.path));
  const items = [...allItems, ...volumeItems].filter((it) => paths.has(it.path));
  const ROLES: Record<string, string> = { autor: "autoria", tema: "assunto de post", participante: "ClicheCast", revista: "revista impressa" };
  const roles = person.roles.map((r) => ROLES[r] ?? r).join(" · ");
  const issues = person.items.filter((i) => i.path.startsWith("/volumes/") && !i.path.includes("#")); // whole-issue credits; pieces are in the table
  return (
    <Frame
      crumbs={[{ label: "Pessoas", href: "?view=graph" }]}
      detail={person.name}
      focus={[person.slug]}
    >
      <header className="person-head" data-pagefind-body data-pagefind-filter="group:Pessoas" data-pagefind-meta={`note:${person.items.length}`}>
        <h1>{person.name}</h1>
        <p>
          {person.items.length} {person.items.length === 1 ? "referência" : "referências"} no arquivo · {roles}
        </p>
        {issues.length > 0 && (
          <p>
            Na revista:{" "}
            {issues.map((i) => (
              <Link key={i.path} href={i.path} className="cell-link">
                {i.title}
              </Link>
            ))}
          </p>
        )}
      </header>
      <ArchiveTable kind="articles" items={rows(items)} label={person.name} />
    </Frame>
  );
}
