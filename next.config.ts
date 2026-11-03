import type { NextConfig } from "next";

const config: NextConfig = {
  output: "export",
  trailingSlash: true, // match the old WordPress permalinks
  images: { unoptimized: true },
  // in production worker.js serves these from R2; `next dev` reads them from the bucket's public r2.dev URL
  ...(process.env.NODE_ENV === "development" && {
    rewrites: async () => [
      ...["wp-content/uploads", "exp/media"].map((dir) => ({
        source: `/${dir}/:path*`,
        destination: `https://pub-4f76cb49c47f4cf3beba48281df495eb.r2.dev/${dir}/:path*`,
      })),
      // the static /exp/ mini-site: Cloudflare serves folder index.html files, `next dev` doesn't
      { source: "/exp/", destination: "/exp/index.html" },
      { source: "/exp/:page/", destination: "/exp/:page/index.html" },
    ],
  }),
};

export default config;
