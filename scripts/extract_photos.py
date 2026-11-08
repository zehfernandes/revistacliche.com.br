#!/usr/bin/env python3
"""Turn photos of a printed issue (no PDF) into page scans like extract_pdfs.py makes.

usage: python3 scripts/extract_photos.py n3 <photos dir>      (needs: pip3 install --user opencv-python-headless)

scripts/<n>-photos.json lists, per spread (keyed by its first page), the photo and the page corners
picked by eye on the photo scaled to 1000px on its long side: L and R the outer edges, G the left page's
gutter edge and G2 the right page's (defaults to G), each [[x, y top], [x, y bottom]]; rot 180 for a photo
shot upside down. Top and bottom edges are snapped to the paper/wood boundary between those corners and fitted
with a parabola, since the pages curl up at the gutter; each page is remapped column by column onto a flat
square, white-balanced on its paper, sharpened and saved as p-01-2x.jpg (2800), p-01.jpg (1400) and p-01-sm.jpg (600).
Spreads nobody photographed are left out and the pages after them move up (keys are viewer pages).
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageCms, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRGB = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()
H = 2800          # page side; N3 is square (the closed covers measure 1:1)
PAPER = np.array([238, 244, 247], np.float32)  # BGR: the soft white of the printed paper
INSET = .008      # trim off the outer edges: page stacks and wood the eye-picked corners let in


def paper_mask(small):
    h, s, v = cv2.split(cv2.cvtColor(cv2.GaussianBlur(small, (5, 5), 0), cv2.COLOR_BGR2HSV))
    wood = (h >= 3) & (h <= 24) & (s > 70) & (v > 15) & (v < 175)
    return cv2.morphologyEx((~wood).astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))


def snap(mask, a, b, top, win=18):
    """y(x) of the paper edge from corner a to corner b, in preview px."""
    line = np.polyfit([a[0], b[0]], [a[1], b[1]], 1)
    xs, ys = [], []
    x0, x1 = sorted((a[0], b[0]))
    pad = (x1 - x0) * .06
    for x in np.arange(x0 + pad, x1 - pad, 3):
        ye = np.polyval(line, x)
        lo, hi = int(max(ye - win, 0)), int(min(ye + win, mask.shape[0] - 1))
        col = mask[lo:hi, int(x)]
        if top:  # going down, wood turns into paper that lasts
            idx = [i for i in range(1, len(col) - 4) if col[i:i + 5].all() and not col[i - 1]]
            if idx: xs.append(x); ys.append(lo + idx[0])
        else:    # going down, paper turns into wood
            idx = [i for i in range(4, len(col) - 1) if col[i - 4:i + 1].all() and not col[i + 1]]
            if idx: xs.append(x); ys.append(lo + idx[-1])
    xs, ys = np.array(xs), np.array(ys)
    for _ in range(3):  # drop fingers and stray blobs
        if len(xs) < 12: return lambda x: np.polyval(line, x)
        r = np.abs(np.polyval(np.polyfit(xs, ys, 2), xs) - ys)
        keep = r < max(2.5, 2.5 * np.median(r))
        xs, ys = xs[keep], ys[keep]
    if len(xs) < 12: return lambda x: np.polyval(line, x)
    p = np.polyfit(np.r_[xs, a[0], b[0]], np.r_[ys, a[1], b[1]], 2)
    return lambda x: np.polyval(p, x)


def page(img, k, mask, tl, bl, tr, br, outer):
    top, bot = snap(mask, tl, tr, True), snap(mask, bl, br, False)
    u0, u1 = (INSET if outer in ("left", "both") else 0), 1 - (INSET if outer in ("right", "both") else 0)
    u = np.linspace(u0, u1, H)
    v = np.linspace(INSET / 2, 1 - INSET / 2, H)[:, None]
    xt = tl[0] + (tr[0] - tl[0]) * u
    xb = bl[0] + (br[0] - bl[0]) * u
    yt, yb = top(xt), bot(xb)
    mx = ((xt + (xb - xt) * v) / k).astype(np.float32)
    my = ((yt + (yb - yt) * v) / k).astype(np.float32)
    return cv2.remap(img, mx, my, cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)


def levels(im):
    # take out the room's warm cast: scale each channel so the paper lands on a soft white, nothing else.
    # (no black point or curve: they shifted the colours and darkened the pages)
    hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
    paper = (hsv[..., 1] < 40) & (hsv[..., 2] > np.percentile(hsv[..., 2], 60))
    if paper.mean() < .02: paper = hsv[..., 2] >= np.percentile(hsv[..., 2], 98)
    white = np.percentile(im[paper], 95, axis=0)
    return np.clip(im.astype(np.float32) * (PAPER / white), 0, 255).astype(np.uint8)


def crisp(im):
    # a light unsharp mask on lightness only, so text edges firm up without touching the colours
    lab = cv2.cvtColor(im, cv2.COLOR_BGR2LAB)
    L = lab[..., 0].astype(np.float32)
    d = L - cv2.GaussianBlur(L, (0, 0), 1.5)
    d[np.abs(d) < 2] = 0
    lab[..., 0] = np.clip(L + d * .8, 0, 255).astype(np.uint8)
    return cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)


def save(bgr, out, n):
    im = Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
    im.save(out / f"p-{n:02d}-2x.jpg", quality=80, optimize=True, progressive=True, icc_profile=SRGB)
    im.thumbnail((1400, 1400), Image.LANCZOS)
    im.save(out / f"p-{n:02d}.jpg", quality=80, optimize=True, progressive=True, icc_profile=SRGB)
    im.thumbnail((600, 600), Image.LANCZOS)
    im.save(out / f"p-{n:02d}-sm.jpg", quality=80, optimize=True, icc_profile=SRGB)  # baseline: decodes in one pass


def main(n, photos):
    spreads = json.loads((ROOT / "scripts" / f"{n}-photos.json").read_text())
    out = ROOT / "public" / "volumes" / n
    out.mkdir(parents=True, exist_ok=True)
    for first, s in spreads.items():
        img = cv2.cvtColor(np.array(ImageOps.exif_transpose(Image.open(Path(photos) / f"IMG_{s['photo']}.JPG")).convert("RGB")), cv2.COLOR_RGB2BGR)
        k = 1000 / max(img.shape[:2])
        mask = paper_mask(cv2.resize(img, None, fx=k, fy=k, interpolation=cv2.INTER_AREA))
        L, R = s["L"], s["R"]
        flip = s.get("rot") == 180  # outer edges swap sides once the photo is turned
        if "G" in s:
            G, G2 = s["G"], s.get("G2", s["G"])
            pages = [page(img, k, mask, L[0], L[1], G[0], G[1], "right" if flip else "left"),
                     page(img, k, mask, G2[0], G2[1], R[0], R[1], "left" if flip else "right")]
        else:
            pages = [page(img, k, mask, L[0], L[1], R[0], R[1], "both")]
        if flip: pages = [cv2.rotate(p, cv2.ROTATE_180) for p in pages[::-1]]
        spread = crisp(levels(np.hstack(pages)))  # one white point per spread keeps facing pages even
        for i in range(len(pages)):
            save(spread[:, i * H:(i + 1) * H], out, int(first) + i)
        print(first, s["photo"], flush=True)


if __name__ == "__main__":
    main(*sys.argv[1:])
