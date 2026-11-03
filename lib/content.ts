import articlesJson from "@/content/articles.json";
import podcastsJson from "@/content/podcasts.json";
import peopleJson from "@/content/people.json";
import aboutJson from "@/content/about.json";
import volumesJson from "@/content/volumes.json";
import volumeItemsJson from "@/content/volume-items.json";

export type Section = { id: string; label: string; level: number };
export type Item = {
  id: number;
  path: string;
  slug: string;
  title: string;
  date: string;
  author: { name: string; slug: string };
  series: string[];
  filtro: string[];
  cover: string | null;
  excerpt: string;
  sections: Section[];
  html: string;
  episode?: number | null;
  audio?: string | null;
  duration?: string | null;
  people: string[];
  participants?: { name: string; slug: string }[];
};
export type Person = { name: string; slug: string; roles: string[]; items: { title: string; path: string }[] };

export const articles = articlesJson as Item[];
export const people = peopleJson as Person[];
const nameOf = Object.fromEntries(people.map((p) => [p.slug, p.name]));
export const podcasts = (podcastsJson as Item[]).map((p) => ({ ...p, participants: p.people.map((slug) => ({ slug, name: nameOf[slug] ?? slug })) }));
export const about = aboutJson;
export const allItems = [...articles, ...podcasts];

// The printed issues, curated in content/volumes.json; scans and page text come from scripts/extract_pdfs.py.
type Volume = {
  n: string;
  label: string;
  year: string | null;
  theme?: string;
  pages: number;
  scans?: string;
  cover: string | null;
  people?: string[];
  team?: string[];
  contents: { title: string; page?: number; authors?: string[]; illustrators?: string[]; section?: string; search?: boolean }[];
};
export const volumes = volumesJson.volumes as Volume[];
// the credited pieces of the issues, shaped like articles so the tables and people pages list them
export const volumeItems = volumeItemsJson as Item[];

export { formatDate } from "./format";

// What the archive tables need: the body text stays on the server instead of being sent to the client.
export type Row = Omit<Item, "html" | "sections" | "excerpt">;
export const rows = (items: Item[]): Row[] => items.map(({ html, sections, excerpt, ...row }) => row);
