#!/usr/bin/env python3
"""Read the printed issues: page text for search, page scans for the volume viewer.

usage: python3 scripts/extract_pdfs.py n2=<path.pdf> n4=<path.pdf> ...

Writes content/volume-text.json ({"n4": ["page 1 text", ...]}, merged with what is there) and
public/volumes/<n>/p-01.jpg… Needs poppler (pdftotext), Ghostscript, Pillow and Adobe's SWOP profile.
"""
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageCms

ROOT = Path(__file__).resolve().parent.parent
TEXT = ROOT / "content" / "volume-text.json"
# The PDFs carry no output intent; SWOP v2 was InDesign's default CMYK space here in 2015.
SWOP = "/Library/Application Support/Adobe/Color/Profiles/Recommended/USWebCoatedSWOP.icc"
SRGB = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()


def pages(pdf):
    n = int(re.search(r"Pages:\s+(\d+)", subprocess.run(["pdfinfo", pdf], capture_output=True, text=True).stdout)[1])
    for p in range(1, n + 1):
        text = subprocess.run(["pdftotext", "-f", str(p), "-l", str(p), pdf, "-"], capture_output=True, text=True).stdout
        yield re.sub(r"\s+", " ", text).strip()


def scan(pdf, out):
    # Ghostscript sends CMYK through the print profile and leaves the RGB the files also use (some fills
    # went RGB in InDesign/Quartz) as RGB; poppler can't keep the two apart. Rendered at 303dpi (2803px for the N4's
    # 666pt page), sized down to 2800 (p-01-2x.jpg, retina), 1400 (p-01.jpg) and 600 (p-01-sm.jpg, phones: the
    # stacked spreads are half the screen wide, and 76 pages decoded at 1400px don't fit a phone's image memory).
    gs = ["gs", "-q", "-dSAFER", "-dBATCH", "-dNOPAUSE", "-sDEVICE=png16m", "-r303", "-dTextAlphaBits=4", "-dGraphicsAlphaBits=4",
          f"-sDefaultCMYKProfile={SWOP}", "-dOverprint=/simulate", "-dRenderIntent=1", "-dBlackPtComp=1"]
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run([*gs, f"-sOutputFile={tmp}/p-%02d.png", pdf], check=True)
        for f in sorted(Path(tmp).glob("p-*.png")):
            im = Image.open(f)
            im.thumbnail((2800, 2800), Image.LANCZOS)
            im.save(out / f"{f.stem}-2x.jpg", quality=80, optimize=True, progressive=True, icc_profile=SRGB)
            im.thumbnail((1400, 1400), Image.LANCZOS)
            im.save(out / f.with_suffix(".jpg").name, quality=80, optimize=True, progressive=True, icc_profile=SRGB)
            im.thumbnail((600, 600), Image.LANCZOS)
            im.save(out / f"{f.stem}-sm.jpg", quality=80, optimize=True, icc_profile=SRGB)  # baseline: decodes in one pass


def main(*args):
    text = json.loads(TEXT.read_text()) if TEXT.exists() else {}
    for arg in args:
        n, pdf = arg.split("=", 1)
        text[n] = list(pages(pdf))
        scans = ROOT / "public" / "volumes" / n
        scans.mkdir(parents=True, exist_ok=True)
        scan(pdf, scans)
        print(f"{n}: {len(text[n])} pages, {sum(map(len, text[n]))} chars")
    TEXT.write_text(json.dumps(text, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main(*sys.argv[1:])
