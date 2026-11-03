import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationNodeDatum } from "d3-force";
import graphJson from "@/content/graph.json";

type Node = SimulationNodeDatum & { slug: string; name: string; count: number; r: number };
type Link = { source: string | Node; target: string | Node; weight: number };

// Laid out once at build time, with a seeded random source so the picture never changes between builds.
function layout() {
  // the graph is about connections: people who never appear with anyone stay on their own pages
  const degree: Record<string, number> = {};
  for (const l of graphJson.links) for (const s of [l.source, l.target]) degree[s] = (degree[s] ?? 0) + 1;
  const nodes: Node[] = graphJson.nodes.filter((n) => degree[n.slug]).map((n) => ({ ...n, r: 3 + Math.sqrt(n.count) * 2.2 }));
  const links: Link[] = graphJson.links.map((l) => ({ ...l }));
  let seed = 1;
  forceSimulation(nodes)
    .randomSource(() => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646)
    .force("link", forceLink<Node, Link>(links).id((d) => d.slug).distance(90)
      // hubs (the hosts) get weak links so their guests don't collapse onto them
      .strength((l) => Math.min(1, l.weight / Math.min(degree[(l.source as Node).slug], degree[(l.target as Node).slug]))))
    .force("charge", forceManyBody().strength(-260).distanceMax(500))
    .force("x", forceX(0).strength(0.05))
    .force("y", forceY(0).strength(0.08))
    .force("collide", forceCollide<Node>((d) => d.r + 6))
    .force("center", forceCenter(0, 0))
    .stop()
    .tick(500);

  const round = (v = 0) => Math.round(v * 10) / 10;
  const xs = nodes.map((n) => n.x!), ys = nodes.map((n) => n.y!);
  const pad = 60;
  return {
    viewBox: [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) - Math.min(...xs) + pad * 2, Math.max(...ys) - Math.min(...ys) + pad * 2].map(round).join(" "),
    nodes: nodes.map((n) => ({ slug: n.slug, name: n.name, count: n.count, r: round(n.r), x: round(n.x), y: round(n.y) })),
    links: links.map((l) => {
      const [s, t] = [l.source as Node, l.target as Node];
      return { a: s.slug, b: t.slug, weight: l.weight, x1: round(s.x), y1: round(s.y), x2: round(t.x), y2: round(t.y) };
    }),
  };
}

export const peopleGraph = layout();
export type PeopleGraph = typeof peopleGraph;
