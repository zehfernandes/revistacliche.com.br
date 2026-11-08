#!/usr/bin/env python3
"""Slide images for the talk viewer, from the Keynote PDF exports.

usage: python3 scripts/extract_talks.py design-colaborativo=<path.pdf> ppp=<path.pdf> ...

Writes public/talks/<slug>/p-01.jpg (1400px wide) and p-01-sm.jpg (600px, phones), the names the
SpreadViewer reads. Prints the slide count to put in content/talks.json. Needs poppler (pdftoppm).
"""
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main(*args):
    for arg in args:
        slug, pdf = arg.split("=", 1)
        out = ROOT / "public" / "talks" / slug
        out.mkdir(parents=True, exist_ok=True)
        for width, suffix, opts in ((1400, "", "quality=80,progressive=y,optimize=y"), (600, "-sm", "quality=80,optimize=y")):
            with tempfile.TemporaryDirectory() as tmp:
                subprocess.run(["pdftoppm", "-q", "-jpeg", "-jpegopt", opts, "-scale-to-x", str(width), "-scale-to-y", "-1", pdf, f"{tmp}/s"], check=True)
                files = sorted(Path(tmp).glob("s-*.jpg"))  # pdftoppm pads to the page count's digits
                for i, f in enumerate(files, 1):
                    f.replace(out / f"p-{i:02d}{suffix}.jpg")
        print(f"{slug}: {len(files)} slides")


if __name__ == "__main__":
    main(*sys.argv[1:])
