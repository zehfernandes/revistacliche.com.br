import { peopleGraph } from "@/lib/graph";

// Written once at build time as /people-graph.json, so pages don't each carry the whole graph.
export const dynamic = "force-static";

export function GET() {
  return Response.json(peopleGraph);
}
