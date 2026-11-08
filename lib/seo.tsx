import type { Metadata } from "next";

export const SITE = "https://revistacliche.com.br";
// content paths are stored decoded (義足のmoses, spaces in upload names)
export const abs = (path: string) => SITE + encodeURI(path);

// Next merges metadata shallowly: a page's openGraph replaces the layout's, so every page builds its whole block here.
export function seo(path: string, { title, description, image, ...og }: { title?: string; description?: string; image?: string | null } & Record<string, unknown> = {}): Metadata {
  return {
    ...(description && { description }),
    alternates: { canonical: path },
    openGraph: {
      siteName: "Revista Cliche",
      locale: "pt_BR",
      type: "website",
      url: path,
      ...(title && { title }),
      ...(description && { description }),
      images: image ?? "/brand/logo-cliche.png",
      ...og,
    },
    twitter: { card: image ? "summary_large_image" : "summary" },
  };
}

// "<" escaped so text from the archive can't close the script tag
export const JsonLd = ({ data }: { data: object }) => (
  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />
);

// summaries come from WordPress excerpts: strip tags/entities and keep them search-snippet sized
export const plain = (s: string, max = 160) => {
  const t = s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1).replace(/\s+\S*$/, "") + "…" : t;
};
