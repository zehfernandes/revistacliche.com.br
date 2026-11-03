// The site is the static Next export in out/ (served by the ASSETS binding). This Worker only runs for:
// old WordPress /?p=ID links, the two feed addresses, and uploads/MP3s, which live in R2 at their old paths.
import postIds from "./content/post-ids.json";

const MEDIA = /^\/(wp-content\/uploads|exp\/media)\//;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/" && url.searchParams.has("p")) {
      const to = postIds[url.searchParams.get("p")];
      if (to) return Response.redirect(new URL(to, url).href, 301);
    }

    const feedFile = { "/feed/": "/feed/posts.xml", "/feed/podcast/": "/feed/podcast.xml" }[url.pathname];
    if (feedFile) {
      const feed = await env.ASSETS.fetch(new URL(feedFile, url));
      return new Response(feed.body, { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
    }

    // ".." in a name is stored as "." in R2: the Cloudflare API refuses keys containing ".."
    if (MEDIA.test(url.pathname)) return media(request, env, decodeURIComponent(url.pathname.slice(1)).replaceAll("..", "."));

    return env.ASSETS.fetch(request);
  },
};

// ponytail: every request reads R2 (free up to 10M reads/month); put caches.default in front if traffic grows
async function media(request, env, key) {
  const object = await env.MEDIA.get(key, { range: request.headers, onlyIf: request.headers });
  if (!object) return env.ASSETS.fetch(new URL("/404.html", request.url)).then((r) => new Response(r.body, { status: 404, headers: r.headers }));

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("accept-ranges", "bytes");
  headers.set("cache-control", "public, max-age=31536000, immutable"); // uploads never change
  if (!("body" in object)) return new Response(null, { status: 304, headers }); // If-None-Match matched

  // players seek with Range requests: answer with just that slice
  if (request.headers.has("range") && object.range) {
    const { offset, length, suffix } = object.range;
    const start = suffix !== undefined ? object.size - suffix : offset ?? 0;
    const end = suffix !== undefined ? object.size - 1 : length !== undefined ? start + length - 1 : object.size - 1;
    headers.set("content-range", `bytes ${start}-${end}/${object.size}`);
    return new Response(object.body, { status: 206, headers });
  }
  return new Response(object.body, { headers });
}
