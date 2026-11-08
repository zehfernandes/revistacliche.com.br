"use client";

import { useEffect, useRef } from "react";

// Two pages per spread, free horizontal scroll, #n in the URL tracks the visible spread.
// slides: one 4:3 talk slide per spread, full width when stacked on phones.
// photos: the scans are photos, which already have real grain, light and colour, so no scan look on top.
export function SpreadViewer({ spreads, scans, hires, slides, photos }: { spreads: number[][]; scans?: string; hires?: boolean; slides?: boolean; photos?: boolean }) {
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = track.current!;
    const start = Number(location.hash.slice(1));
    // mobile stacks the spreads vertically (globals.css): the page scrolls, not the track
    const vertical = matchMedia("(max-width: 760px)").matches;
    if (start) el.children[start - 1]?.scrollIntoView({ inline: "start", block: vertical ? "start" : "nearest" });

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) history.replaceState(null, "", `#${(e.target as HTMLElement).dataset.n}`);
      },
      // vertical: several spreads fit on screen, so track the one crossing a line near the top
      vertical ? { rootMargin: "-20% 0px -79% 0px" } : { root: el, threshold: 0.6 },
    );
    [...el.children].forEach((c) => io.observe(c));

    // vertical wheel scrolls horizontally, like the reference
    const wheel = (e: WheelEvent) => {
      if (el.scrollWidth > el.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollBy({ left: e.deltaY });
      }
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      io.disconnect();
      el.removeEventListener("wheel", wheel);
    };
  }, []);

  return (
    <div className={["spreads", slides && "slides", photos && "photos"].filter(Boolean).join(" ")} ref={track}>
      {spreads.map((pages, i) => (
        <section className="spread" key={i} id={String(i + 1)} data-n={i + 1}>
          {pages.map((p) => {
            const f = `${scans}/p-${String(p).padStart(2, "0")}`;
            return scans ? (
              <img
                className="page scan"
                key={p}
                src={`${f}.jpg`}
                // pages are square, as wide as the .spreads track is tall (globals.css)
                // -sm (600px) is what phones pick for the stacked spreads, half the screen wide
                srcSet={`${f}-sm.jpg 600w, ${f}.jpg 1400w${hires ? `, ${f}-2x.jpg 2800w` : ""}`}
                sizes={slides ? "(max-width: 760px) 100vw, calc((100vh - 158px) * 4 / 3)" : "(max-width: 760px) 50vw, calc(100vh - 158px)"}
                alt={`p. ${p}`}
                loading={i < 3 ? "eager" : "lazy"}
                decoding="async"
              />
            ) : (
              <div className="page" key={p}>
                <span>{p}</span>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
