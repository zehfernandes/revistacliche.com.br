"""Rebuild the Cliche.EXP special edition (Nov 2013, /exp/) as static files in public/exp/.

The original was a hand-made static site, not WordPress. Pages come from the Wayback Machine;
assets come from the local backup when present, else Wayback. MP3s stay in R2 (worker.js serves /exp/media/).

usage: python3 -I scripts/mirror_exp.py [local_backup_dir]
"""
import re
import sys
import time
import urllib.request
from pathlib import Path
from urllib.parse import urljoin, urlparse, unquote

OUT = Path(__file__).resolve().parent.parent / "public" / "exp"
BACKUP = Path(sys.argv[1]) if len(sys.argv) > 1 else None
ORIGIN = "http://www.revistacliche.com.br"
PAGES = ["", "design-e-genero-marines-ribeiro/", "design-estrategico-daniel-campos/",
         "design-livre-frederick-amstel/", "tipografia-eduilson-coan/", "ai-ux-ui-wtf-erico-fileno/"]
REF = re.compile(r'(?:href|src)="([^"#?]+)|url\(\s*[\'"]?([^\'")?#]+)|@import\s+[\'"]([^\'"]+)')


def wayback(url, stamp="2016"):
    for attempt in range(4):
        try:
            with urllib.request.urlopen(f"https://web.archive.org/web/{stamp}id_/{url}", timeout=90) as r:
                return r.read()
        except Exception as e:
            print(f"  retry {attempt + 1} {url}: {e}")
            time.sleep(5 * (attempt + 1))
    raise RuntimeError(url)


def exp_path(url):
    """'/exp/css/main.css' -> 'css/main.css', or None when not an /exp/ asset worth mirroring."""
    p = urlparse(url)
    if p.netloc and "revistacliche.com.br" not in p.netloc:
        return None
    path = unquote(p.path)
    if not path.startswith("/exp/") or path.startswith("/exp/media/") or path.endswith("/"):
        return None
    return path.removeprefix("/exp/")


def refs(text, base):
    return {exp_path(urljoin(base, "".join(m))) for m in REF.findall(text)} - {None}


assets = set()
for page in PAGES:
    url = f"{ORIGIN}/exp/{page}"
    print("page", url)
    html = wayback(url).decode("utf-8")
    assets |= refs(html, url)
    html = re.sub(r"https?://(www\.)?revistacliche\.com\.br/", "/", html)  # same-site links work on any host
    (OUT / page).mkdir(parents=True, exist_ok=True)
    (OUT / page / "index.html").write_text(html)

done = set()
while assets - done:
    rel = sorted(assets - done)[0]
    done.add(rel)
    local = BACKUP / rel if BACKUP else None
    data = local.read_bytes() if local and local.is_file() else None
    if data is None:
        print("asset", rel)
        try:
            data = wayback(f"{ORIGIN}/exp/{rel}", "2017")
        except RuntimeError:
            print("  MISSING", rel)
            continue
    (OUT / rel).parent.mkdir(parents=True, exist_ok=True)
    (OUT / rel).write_bytes(data)
    if rel.endswith(".css"):
        assets |= refs(data.decode("utf-8", "replace"), f"{ORIGIN}/exp/{rel}")

print(f"{len(PAGES)} pages, {len(done)} assets -> {OUT}")
