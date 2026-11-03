#!/usr/bin/env python3
"""Export the Revista Cliche WordPress dump to JSON for the static site.

usage: python3 -I scripts/export_wp.py <dump.sql> <uploads_dir> [sample.txt]

sample.txt lists post slugs (one per line, # comments). Without it every post is exported.
Uploads are not copied: they are mirrored in R2 (bucket revistacliche-media) and worker.js serves them at the old paths.
"""
import html
import json
import re
import sys
from collections import defaultdict
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"

PODCAST = "ClicheCast"
HIDDEN_CATEGORIES = {"Não Destaque"}  # display flag on the old home, not a series
SUBJECT_SERIES = {"Designers que deveria conhecer", "Pocket Entrevista"}  # title is often a person/studio


def looks_like_name(title):
    # ponytail: heuristic; swap for a curated subjects list when the full archive is in
    words = title.split()
    return len(words) <= 4 and "," not in title and all(w[0].isupper() or len(w) <= 3 for w in words)
INSTITUTIONAL = {"Projeto Cliche", "Padrão do site"}  # posting accounts, not people

TOKEN = re.compile(r"'((?:[^'\\]|\\.)*)'|(NULL)|(-?\d+(?:\.\d+)?)|(\()|(\))|(;)")
ESCAPES = {"n": "\n", "r": "\r", "t": "\t", "0": "\0", "Z": "\x1a"}
BASE = "https://revistacliche.com.br"
SITE = re.compile(r"https?://(?:www\.)?revistacliche\.com\.br", re.I)


def unescape(s):
    return re.sub(r"\\(.)", lambda m: ESCAPES.get(m.group(1), m.group(1)), s)


def read_tables(sql, names):
    out = {n: [] for n in names}
    for m in re.finditer(r"INSERT INTO `(\w+)` \([^)]*\) VALUES", sql):
        rows = out.get(m.group(1))
        if rows is None:
            continue
        row = None
        for t in TOKEN.finditer(sql, m.end()):
            s, null, num, opened, closed, end = t.groups()
            if end:
                break
            if opened:
                row = []
            elif closed:
                rows.append(row)
            elif s is not None:
                row.append(unescape(s))
            else:
                row.append(None if null else num)
    return out


# --- content cleaning -------------------------------------------------------

BLOCK = (r"(?:table|thead|tbody|tfoot|tr|td|th|div|dl|dd|dt|ul|ol|li|pre|form|blockquote|address|"
         r"p|h[1-6]|hr|fieldset|section|article|aside|header|footer|nav|figure|figcaption|iframe|object|embed|script|style)")


def autop(text):
    """Minimal port of WordPress wpautop: blank lines are paragraphs, single newlines are <br>."""
    text = re.sub(r"(<" + BLOCK + r"[\s/>])", r"\n\n\1", text)
    text = re.sub(r"(</" + BLOCK + r">)", r"\1\n\n", text)
    out = []
    for chunk in re.split(r"\n\s*\n", text):
        chunk = chunk.strip()
        if not chunk:
            continue
        if re.match(r"</?" + BLOCK + r"[\s/>]", chunk):
            out.append(chunk)
        else:
            out.append("<p>" + chunk.replace("\n", "<br>\n") + "</p>")
    return re.sub(r"<p>(?:\s|&nbsp;|<br>)*</p>\n?", "", "\n".join(out))


def embed(url):
    url = html.unescape(url.strip())
    if m := re.search(r"(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/(?:embed|v)/)([\w-]{11})", url):
        src = f"https://www.youtube-nocookie.com/embed/{m.group(1)}"
        site, page = "YouTube", f"https://www.youtube.com/watch?v={m.group(1)}"
    elif m := re.search(r"vimeo\.com/(?:video/)?(\d+)", url):
        src = f"https://player.vimeo.com/video/{m.group(1)}"
        site, page = "Vimeo", f"https://vimeo.com/{m.group(1)}"
    else:
        return f'<p><a href="{url}">{url}</a></p>'
    # the link stays useful when the owner later blocks embedding or removes the video
    return (f'<figure class="embed-figure"><div class="embed"><iframe src="{src}" loading="lazy" '
            f'allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>'
            f'<figcaption><a href="{page}" target="_blank" rel="noopener">Assistir no {site} ↗</a></figcaption></figure>')


def caption(m):
    attrs, inner = m.group(1), m.group(2).strip()
    text = re.search(r'caption="([^"]*)"', attrs)
    if text:
        text = text.group(1)
    else:  # newer format: caption text after the image
        split = re.match(r"(.*>)([^<>]*)$", inner, re.S)
        inner, text = (split.group(1), split.group(2).strip()) if split else (inner, "")
    cap = f"<figcaption>{text}</figcaption>" if text else ""
    return f"\n\n<figure>{inner}{cap}</figure>\n\n"


def clean(content, paths_by_id):
    t = content.replace("\r\n", "\n").replace("\r", "\n")
    t = re.sub(r"\[caption([^\]]*)\](.*?)\[/caption\]", caption, t, flags=re.S)
    t = re.sub(r"\[embed[^\]]*\](.*?)\[/embed\]", lambda m: "\n\n" + embed(m.group(1)) + "\n\n", t, flags=re.S)
    t = re.sub(r"\[vimeo\s+(?:id=)?\"?(\d+)\"?[^\]]*\]", lambda m: embed("vimeo.com/" + m.group(1)), t)
    t = re.sub(r"\[video\](.*?)\[/video\]", lambda m: embed(m.group(1)), t, flags=re.S)
    t = re.sub(r"\[(powerpress|embendloja|gallery|tweet)[^\]]*\]", "", t)
    # raw iframes and dead Flash <object>/<embed> players → one responsive embed
    video = r"[^\"'\s>]*(?:youtube\.com|youtu\.be|vimeo\.com)[^\"'\s>]*"
    t = re.sub(r"<object.*?</object>|<iframe.*?</iframe>|<embed[^>]*>",
               lambda m: "\n\n" + embed(v.group(0)) + "\n\n" if (v := re.search(video, m.group(0))) else m.group(0),
               t, flags=re.S | re.I)
    # oEmbed: a bare video URL on its own line
    t = re.sub(r"^\s*(https?://\S*(?:youtube\.com|youtu\.be|vimeo\.com)\S*)\s*$",
               lambda m: "\n\n" + embed(m.group(1)) + "\n\n", t, flags=re.M)
    # internal links: /?p=ID → permalink, then drop the domain everywhere
    t = re.sub(r"https?://(?:www\.)?revistacliche\.com\.br/\?p=(\d+)",
               lambda m: paths_by_id.get(m.group(1), m.group(0)), t)
    t = SITE.sub("", t)
    # images linked to WP attachment pages → link to the image file itself
    t = re.sub(r'(<a [^>]*href=")(/[^"]*)("[^>]*>\s*<img [^>]*src="([^"]+)")',
               lambda m: m.group(0) if re.search(r"\.(jpe?g|png|gif)$", m.group(2), re.I)
               else m.group(1) + m.group(4) + m.group(3), t)
    return autop(t)


def add_heading_ids(body):
    sections, seen = [], set()

    def tag(m):
        level, attrs, inner = m.group(1), m.group(2), m.group(3)
        label = html.unescape(re.sub(r"<[^>]+>", "", inner)).strip()
        if not label:
            return m.group(0)
        hid = slugify(label) or f"s{len(sections)}"
        while hid in seen:
            hid += "-"
        seen.add(hid)
        sections.append({"id": hid, "label": label, "level": int(level)})
        return f'<h{level}{attrs} id="{hid}">{inner}</h{level}>'

    body = re.sub(r"<h([2-4])([^>]*)>(.*?)</h\1>", tag, body, flags=re.S | re.I)
    return body, sections


def slugify(s):
    import unicodedata
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:60]


def plain(s, n=220):
    s = html.unescape(re.sub(r"<[^>]+>|\[[^\]]*\]", " ", s))
    s = re.sub(r"\s+", " ", s).strip()
    return s if len(s) <= n else s[:n].rsplit(" ", 1)[0] + "…"


def write_feed(podcasts, feed_meta):
    """The podcast RSS at the old PowerPress address (worker.js serves it at /feed/podcast/).
    Channel values come from the old powerpress_feed option; guids stay the WordPress ones so apps don't duplicate episodes."""
    from email.utils import format_datetime
    from datetime import datetime, timezone
    from urllib.parse import quote, unquote
    x = lambda s: html.escape(s or "", quote=True)
    items = []
    for it in podcasts:
        if not it.get("audio"):
            continue
        guid, gmt, length = feed_meta[it["id"]]
        date = format_datetime(datetime.fromisoformat(gmt).replace(tzinfo=timezone.utc))
        items.append(f"""<item><title>{x(it['title'])}</title><link>{BASE}{it['path']}</link>
<guid isPermaLink="false">{x(guid)}</guid><pubDate>{date}</pubDate><description>{x(it['excerpt'])}</description>
<enclosure url="{x(BASE + quote(unquote(it["audio"])))}" length="{length}" type="audio/mpeg"/>{f"<itunes:duration>{it['duration']}</itunes:duration>" if it['duration'] else ""}</item>""")
    feed = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:atom="http://www.w3.org/2005/Atom">
<channel><title>Revista Cliche</title><link>{BASE}/podcasts/</link><language>pt-BR</language><copyright>Revista Cliche</copyright>
<atom:link href="{BASE}/feed/podcast/" rel="self" type="application/rss+xml"/>
<description>Podcast do projeto colaborativo de design Cliche</description>
<itunes:subtitle>Clichecast</itunes:subtitle><itunes:summary>Podcast do projeto colaborativo de design Cliche</itunes:summary>
<itunes:author>Revista Cliche</itunes:author><itunes:explicit>false</itunes:explicit>
<itunes:owner><itunes:name>Revista Cliche</itunes:name><itunes:email>contato@revistacliche.com.br</itunes:email></itunes:owner>
<itunes:image href="{BASE}/wp-content/uploads/powerpress/itunes.jpg"/><itunes:category text="Arts"><itunes:category text="Design"/></itunes:category>
{chr(10).join(items)}
</channel></rss>
"""
    out = ROOT / "public" / "feed" / "podcast.xml"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(feed)


def write_posts_feed(items, feed_meta, n=10):
    """The main WordPress RSS (worker.js serves it at /feed/): the latest n posts, full text, like WordPress did."""
    from email.utils import format_datetime
    from datetime import datetime, timezone
    from urllib.parse import quote
    x = lambda s: html.escape(s or "", quote=True)
    entries = []
    for it in sorted(items, key=lambda it: feed_meta[it["id"]][1], reverse=True)[:n]:
        guid, gmt, _ = feed_meta[it["id"]]
        date = format_datetime(datetime.fromisoformat(gmt).replace(tzinfo=timezone.utc))
        body = re.sub(r'(src|href)="/', rf'\1="{BASE}/', it["html"])  # readers need absolute URLs
        entries.append(f"""<item><title>{x(it['title'])}</title><link>{BASE}{quote(it['path'])}</link>
<guid isPermaLink="false">{x(guid)}</guid><pubDate>{date}</pubDate><dc:creator>{x(it['author']['name'])}</dc:creator>
{"".join(f"<category>{x(c)}</category>" for c in it['series'])}<description>{x(it['excerpt'])}</description>
<content:encoded><![CDATA[{body.replace("]]>", "]]]]><![CDATA[>")}]]></content:encoded></item>""")
    feed = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
<channel><title>Revista Cliche</title><link>{BASE}/</link><language>pt-BR</language>
<atom:link href="{BASE}/feed/" rel="self" type="application/rss+xml"/>
<description>Projeto colaborativo de design</description>
{chr(10).join(entries)}
</channel></rss>
"""
    (ROOT / "public" / "feed" / "posts.xml").write_text(feed)


# --- main -------------------------------------------------------------------

def main(sql_path, uploads_dir, sample_path=None):
    sql = Path(sql_path).read_text(encoding="utf-8", errors="replace")
    db = read_tables(sql, ["wp_posts", "wp_postmeta", "wp_users", "wp_terms",
                           "wp_term_taxonomy", "wp_term_relationships"])
    uploads = Path(uploads_dir)

    meta = defaultdict(dict)
    for _, post_id, key, value in db["wp_postmeta"]:
        meta[post_id][key] = value
    # institutional accounts get no slug: they have no people page to link to
    users = {u[0]: {"name": u[9], "slug": "" if u[9] in INSTITUTIONAL else u[3]} for u in db["wp_users"]}
    terms = {t[0]: {"name": t[1], "slug": t[2]} for t in db["wp_terms"]}
    taxonomy = {t[0]: (t[2], terms[t[1]]) for t in db["wp_term_taxonomy"]}
    post_terms = defaultdict(lambda: defaultdict(list))
    for obj, tt, *_ in db["wp_term_relationships"]:
        if tt in taxonomy:
            kind, term = taxonomy[tt]
            if term not in post_terms[obj][kind]:  # the dump repeats rows
                post_terms[obj][kind].append(term)

    posts = {p[0]: p for p in db["wp_posts"]}  # dedupe: the dump repeats rows
    published = [p for p in posts.values() if p[20] == "post" and p[7] == "publish"]
    # WordPress stores non-ASCII slugs percent-encoded; the folder must use the real characters, since Cloudflare decodes URLs before looking up files
    path = lambda p: f"/{p[2][:4]}/{p[2][5:7]}/{unquote(p[11])}/"
    paths_by_id = {p[0]: path(p) for p in published}

    wanted = None
    if sample_path:
        lines = Path(sample_path).read_text().splitlines()
        wanted = {l.split("#")[0].strip() for l in lines} - {""}
        wanted_cats = {w.removeprefix("category:") for w in wanted if w.startswith("category:")}

    def attachment_url(att_id):
        f = meta.get(att_id, {}).get("_wp_attached_file")
        return f"/wp-content/uploads/{f}" if f else None

    articles, podcasts, feed_meta = [], [], {}
    for p in sorted(published, key=lambda p: p[2], reverse=True):
        cats = [t["name"] for t in post_terms[p[0]]["category"]]
        if wanted is not None and p[11] not in wanted and not wanted_cats & set(cats):
            continue
        body, sections = add_heading_ids(clean(p[4], paths_by_id))
        cover = attachment_url(meta[p[0]].get("_thumbnail_id")) if "_thumbnail_id" in meta[p[0]] else None
        if not cover and (img := re.search(r'<img[^>]+src="(/wp-content/uploads/[^"]+)"', body)):
            cover = img.group(1)
        item = {
            "id": int(p[0]),
            "path": path(p),
            "slug": p[11],
            "title": html.unescape(p[5]).strip(),
            "date": p[2][:10],
            "author": users.get(p[1], {"name": "Projeto Cliche", "slug": ""}),
            "series": [c for c in cats if c not in HIDDEN_CATEGORIES and c != PODCAST],
            "filtro": [t["name"] for t in post_terms[p[0]]["filtro"]],
            "cover": cover,
            "excerpt": plain(p[6] or p[4]),
            "sections": sections,
            "html": body,
        }
        if PODCAST in cats:
            enc = meta[p[0]].get("enclosure", "").replace("\r", "").split("\n")
            duration = re.search(r'"duration";s:\d+:"([^"]+)"', enc[-1]) if enc else None
            ep = re.search(r"#\s*(\d+)", item["title"])
            item.update({
                "episode": int(ep.group(1)) if ep else 1 if "Zumbis" in item["title"] else None,
                "audio": SITE.sub("", enc[0]) if enc and enc[0] else None,
                "duration": duration.group(1).lstrip("0:") if duration else None,
            })
            podcasts.append(item)
            feed_meta[item["id"]] = (p[18], p[3], enc[1] if len(enc) > 1 else "0")  # guid, date gmt, bytes
        else:
            articles.append(item)
            feed_meta[item["id"]] = (p[18], p[3], "0")

    # media keeps its old paths: worker.js serves /wp-content/uploads/ and /exp/media/ from R2; just report gaps
    refs = set()
    for item in articles + podcasts:
        refs.update(re.findall(r'/wp-content/uploads/[^"\'\s<>)]+', item["html"]))
        refs.update(filter(None, [item["cover"], item.get("audio")]))
    refs = {r for r in refs if r.startswith("/wp-content/")}
    missing = sum(not (uploads / html.unescape(ref).removeprefix("/wp-content/uploads/")).is_file() for ref in refs)
    write_feed(podcasts, feed_meta)
    write_posts_feed(articles + podcasts, feed_meta)

    # people: authors, subjects of series posts, podcast participants and issue contributors
    extra = json.loads((CONTENT / "people-extra.json").read_text())
    user_slugs = {slugify(u["name"]): u["slug"] for u in users.values()}
    people = {}

    def add(name, role, title, path):
        if name in INSTITUTIONAL:
            return None
        slug = user_slugs.get(slugify(name), slugify(name))
        person = people.setdefault(slug, {"name": name, "slug": slug, "roles": set(), "items": []})
        person["roles"].add(role)
        if path not in [i["path"] for i in person["items"]]:
            person["items"].append({"title": title, "path": path})
        return slug

    groups = []  # who appears together in one piece of work → graph links
    for item in articles + podcasts:
        group = {add(item["author"]["name"], "autor", item["title"], item["path"])}
        if SUBJECT_SERIES & set(item["series"]) and looks_like_name(item["title"]):
            group.add(add(item["title"], "tema", item["title"], item["path"]))
        for name in extra["items"].get(item["slug"], []):
            group.add(add(name, "participante", item["title"], item["path"]))
        item["people"] = sorted(group - {None})
        groups.append(group - {None})
    # the printed issues: each piece links its authors and illustrators and lands on its spread
    volumes = json.loads((CONTENT / "volumes.json").read_text())["volumes"]
    text_path = CONTENT / "volume-text.json"
    volume_text = json.loads(text_path.read_text()) if text_path.exists() else {}
    volume_items = []
    for v in volumes:
        if v.get("people"):  # contributors of the whole issue, when there is no per-piece credit yet
            groups.append({add(name, "revista", f"Revista Cliche {v['label']}", f"/volumes/{v['n']}/") for name in v["people"]} - {None})
        team = {add(name, "revista", f"Revista Cliche {v['label']}", f"/volumes/{v['n']}/") for name in v.get("team", [])} - {None}
        for c in v["contents"]:
            names = c.get("authors", []) + c.get("illustrators", [])
            if not names or "page" not in c:
                continue
            path = f"/volumes/{v['n']}/#{c['page'] // 2 + 1}"
            group = [add(name, "revista", c["title"], path) for name in names]
            groups.append(set(group) - {None})
            groups += [{slug, t} for slug in set(group) - {None} - team for t in team]  # pieces hang off the issue's coordinators
            pages = volume_text.get(v["n"], [])
            volume_items.append({
                "id": 900000 + int(v["n"][1:]) * 1000 + c["page"],
                "path": path,
                "slug": f"{v['n']}-p{c['page']}",
                "title": c["title"],
                "date": v.get("date") or v["year"],
                "author": {"name": names[0], "slug": group[0]},
                "series": [f"Revista {v['label']}"] + ([c["section"]] if c.get("section") else []),
                "filtro": [],
                "cover": f"{v['scans']}/p-{c['page']:02d}.jpg" if v.get("scans") else None,
                "excerpt": plain(pages[c["page"] - 1]) if len(pages) >= c["page"] else "",
                "sections": [],
                "html": "",
                "people": sorted(set(group) - {None}),
            })

    weights = defaultdict(int)
    for group in groups:
        for a in group:
            for b in group:
                if a < b:
                    weights[(a, b)] += 1
    graph = {
        "nodes": [{"slug": p["slug"], "name": p["name"], "count": len(p["items"])} for p in people.values()],
        "links": [{"source": a, "target": b, "weight": w} for (a, b), w in sorted(weights.items())],
    }
    people = sorted(({**p, "roles": sorted(p["roles"])} for p in people.values()), key=lambda p: slugify(p["name"]))

    about_page = next(p for p in posts.values() if p[11] == "projeto-cliche" and p[7] == "publish")
    about_html, about_sections = add_heading_ids(clean(about_page[4], paths_by_id))
    years = defaultdict(int)
    for p in published:
        years[p[2][:4]] += 1
    about = {
        "html": about_html,
        "sections": about_sections,
        "stats": {
            "posts": len(published),
            "podcasts": sum(PODCAST in [t["name"] for t in post_terms[p[0]]["category"]] for p in published),
            "authors": len({p[1] for p in published}),
            "years": dict(sorted(years.items())),
        },
    }

    # old WordPress URLs → new pages: path patterns as Cloudflare _redirects, /?p=ID through worker.js
    # first match wins. Archives and attachment pages are per year: a bare /:year/ placeholder would also catch /people/x/
    institutional = [u[3] for u in db["wp_users"] if u[9] in INSTITUTIONAL]
    old_pages = {"projeto-cliche": "/about/", "escreva-sua-materia": "/about/", "nossos-produtos": "/volumes/"}
    rules = ["/category/clichecast/ /podcasts/", "/category/* /articles/", "/tag/* /articles/", "/page/* /"]
    # production lets /author/:slug/ win over a more specific /author/x/ line, so send their people URL instead
    rules += ["/author/:slug/ /people/:slug/"] + [f"/people/{u}/ /about/" for u in institutional]
    rules += [f"/{old}/ {new}" for old, new in old_pages.items()]
    for y in sorted({p[2][:4] for p in published}):
        rules += [f"/{y}/ /articles/", f"/{y}/:month/ /articles/", f"/{y}/:month/:post/:attachment/ /{y}/:month/:post/"]
    (ROOT / "public" / "_redirects").write_text("".join(f"{r} 301\n" for r in rules))
    (CONTENT / "post-ids.json").write_text(json.dumps(paths_by_id, ensure_ascii=False))

    CONTENT.mkdir(exist_ok=True)
    for name, data in [("articles", articles), ("podcasts", podcasts), ("volume-items", volume_items), ("people", people), ("graph", graph), ("about", about)]:
        (CONTENT / f"{name}.json").write_text(json.dumps(data, ensure_ascii=False, indent=1))
    print(f"articles {len(articles)}  podcasts {len(podcasts)}  volume items {len(volume_items)}  people {len(people)}  links {len(graph['links'])}  "
          f"media {len(refs)} ({missing} missing)")
    if wanted is not None:
        found = {i["slug"] for i in articles + podcasts}
        for slug in sorted(wanted - found - {f"category:{c}" for c in wanted_cats}):
            print("not found:", slug)


if __name__ == "__main__":
    main(*sys.argv[1:])
