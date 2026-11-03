"use client";

import { useEffect, useRef, useState } from "react";
import { select } from "d3-selection";
import "d3-transition"; // adds selection.transition()
import type { Transition } from "d3-transition";
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import type { PeopleGraph } from "@/lib/graph";

const MAX_ZOOM = 8;

// The layout is a static file (app/people-graph.json): fetched once and cached by the browser.
export function Graph({ focus }: { focus: string[] }) {
  const [graph, setGraph] = useState<PeopleGraph | null>(null);
  useEffect(() => {
    fetch("/people-graph.json").then((r) => r.json()).then(setGraph, () => {});
  }, []);
  return graph ? <GraphView graph={graph} focus={focus} /> : <div className="graph-wrap" />;
}

// People who appear together in a post, an episode or an issue are linked.
// `focus` highlights the people of the current page. Wheel/pinch zooms at the cursor, drag pans.
function GraphView({ graph, focus }: { graph: PeopleGraph; focus: string[] }) {
  const [x, y, w, h] = graph.viewBox.split(" ").map(Number);
  const [k, setK] = useState(1); // only re-renders when a threshold below is crossed
  const [hover, setHover] = useState<string | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const layer = useRef<SVGGElement>(null);
  const zoom = useRef<ZoomBehavior<SVGSVGElement, unknown>>(null);

  // people of this page who never appear with anyone aren't drawn, so they can't be highlighted
  const active = new Set(hover ? [hover] : focus.filter((s) => graph.nodes.some((n) => n.slug === s)));
  const lit = new Set(active);
  for (const l of graph.links) {
    if (active.has(l.a)) lit.add(l.b);
    if (active.has(l.b)) lit.add(l.a);
  }

  // d3-zoom moves the layer directly, so panning and zooming never re-render the nodes
  useEffect(() => {
    const el = svg.current!;
    const z = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, MAX_ZOOM])
      .translateExtent([[x, y], [x + w, y + h]])
      .clickDistance(4) // a drag doesn't open a person
      .on("zoom", ({ transform: t }) => {
        layer.current!.setAttribute("transform", t.toString());
        el.style.setProperty("--fs", `${13 / Math.sqrt(t.k)}px`);
        setK(t.k >= 2.5 ? 2.5 : t.k > 1.001 ? 1.5 : 1);
      });
    zoom.current = z;
    select(el).call(z);

    // open framed on the page's people and their neighbours
    const around = new Set(focus);
    for (const l of graph.links) if (focus.includes(l.a) || focus.includes(l.b)) around.add(l.a).add(l.b);
    const shown = graph.nodes.filter((n) => around.has(n.slug));
    if (shown.length) {
      const pad = 40;
      const [x0, x1] = [Math.min(...shown.map((n) => n.x)) - pad, Math.max(...shown.map((n) => n.x)) + pad];
      const [y0, y1] = [Math.min(...shown.map((n) => n.y)) - pad, Math.max(...shown.map((n) => n.y)) + pad];
      const s = Math.max(1, Math.min(MAX_ZOOM, w / (x1 - x0), h / (y1 - y0)));
      select(el).call(z.transform, zoomIdentity.translate(x + w / 2, y + h / 2).scale(s).translate(-(x0 + x1) / 2, -(y0 + y1) / 2));
    }
    return () => void select(el).on(".zoom", null);
  }, [x, y, w, h, graph, focus.join()]);

  const animate = (fn: (t: Transition<SVGSVGElement, unknown, null, undefined>) => void) =>
    select(svg.current!).transition().duration(350).call(fn);

  return (
    <div className="graph-wrap">
      <svg
        ref={svg}
        className="graph"
        viewBox={graph.viewBox}
        data-dim={active.size > 0 || undefined}
        data-hover={hover || undefined}
        data-zoomed={k >= 2.5 || undefined}
        onPointerLeave={() => setHover(null)}
      >
        <g ref={layer}>
          <g className="links">
            {graph.links.map((l) => (
              <line
                key={l.a + l.b}
                x1={l.x1}
                y1={l.y1}
                x2={l.x2}
                y2={l.y2}
                strokeWidth={Math.min(4, 0.6 + l.weight * 0.5)}
                data-lit={active.has(l.a) || active.has(l.b) || undefined}
              />
            ))}
          </g>
          {graph.nodes.map((n) => (
            <a key={n.slug} href={`/people/${n.slug}/`} onPointerEnter={() => setHover(n.slug)} data-lit={lit.has(n.slug) || undefined} data-active={active.has(n.slug) || undefined}>
              <circle cx={n.x} cy={n.y} r={n.r} />
              <text x={n.x} y={n.y - n.r - 5} data-always={n.count >= 10 || undefined}>
                {n.name}
              </text>
            </a>
          ))}
        </g>
      </svg>
      <div className="graph-zoom">
        <button onClick={() => animate((t) => zoom.current!.scaleBy(t, 1.5))} aria-label="Aproximar">+</button>
        <button onClick={() => animate((t) => zoom.current!.scaleBy(t, 1 / 1.5))} aria-label="Afastar">−</button>
        <button onClick={() => animate((t) => zoom.current!.transform(t, zoomIdentity))} aria-label="Ver tudo" disabled={k === 1}>
          ⤢
        </button>
      </div>
    </div>
  );
}
