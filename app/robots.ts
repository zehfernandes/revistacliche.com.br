import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

export const dynamic = "force-static";

// everyone is welcome, AI crawlers included: it's a public archive
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: "/search/" }, sitemap: `${SITE}/sitemap.xml` };
}
