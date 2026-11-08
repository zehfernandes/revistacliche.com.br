import type { MetadataRoute } from "next";
import { allItems, people, talks, volumes } from "@/lib/content";
import { abs } from "@/lib/seo";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...["/", "/articles/", "/podcasts/", "/volumes/", "/talks/"].map((p) => ({ url: abs(p) })),
    ...volumes.filter((v) => v.scans).map((v) => ({ url: abs(`/volumes/${v.n}/`) })),
    ...talks.filter((t) => t.slides).map((t) => ({ url: abs(`/talks/${t.slug}/`) })),
    ...allItems.map((it) => ({ url: abs(it.path), lastModified: it.date })),
    ...people.map((p) => ({ url: abs(`/people/${p.slug}/`) })),
  ];
}
