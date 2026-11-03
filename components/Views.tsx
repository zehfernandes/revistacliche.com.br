"use client";

import Form from "next/form";
import { useEffect, useRef, useState } from "react";

// The bottom bar: an always-open search field that submits to /search/, and a graph icon
// on the right that raises the people graph in a panel above the bar.
export function Views({ graph, children }: { graph: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(false); // the graph mounts on first open, not on every page
  const [query, setQuery] = useState("");
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("view") === "graph") toggle(true);
    if (location.pathname.startsWith("/search")) setQuery(params.get("q") ?? "");
    const keys = (e: KeyboardEvent) => {
      if (e.key === "Escape") toggle(false);
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle(false);
        field.current?.focus();
      }
    };
    addEventListener("keydown", keys);
    return () => removeEventListener("keydown", keys);
  }, []);

  function toggle(on: boolean) {
    setOpen(on);
    if (on) setSeen(true);
    const url = new URL(location.href);
    if (on) url.searchParams.set("view", "graph");
    else url.searchParams.delete("view");
    history.replaceState(null, "", url);
  }

  return (
    <>
      <main className="content">{children}</main>
      <div className="views-backdrop" data-open={open || undefined} onClick={() => toggle(false)} />
      <div className="views" data-open={open || undefined}>
        <div className="views-panel" aria-hidden={!open}>
          <div className="views-scroll">{seen && graph}</div>
        </div>

        <Form
          action="/search/"
          className="bar"
          role="search"
          onSubmit={(e) => {
            if (!query.trim()) e.preventDefault();
            else toggle(false);
          }}
        >
          <button type="submit" className="bar-icon" aria-label="Buscar">
            <Icon name="search" />
          </button>
          <input
            ref={field}
            name="q"
            type="search"
            className="bar-field"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => toggle(false)}
            placeholder="Buscar pessoas, artigos, episódios…"
          />
          <button type="button" className="bar-icon" aria-label="Pessoas" aria-pressed={open} onClick={() => toggle(!open)}>
            <Icon name="graph" />
          </button>
        </Form>
      </div>
    </>
  );
}

function Icon({ name }: { name: "search" | "graph" }) {
  const paths = {
    search: <><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 5 5" /></>,
    graph: <><circle cx="7" cy="8" r="1.6" /><circle cx="17" cy="7" r="1.6" /><circle cx="12" cy="17" r="1.6" /><path d="m7.7 9.5 3.6 6M16.3 8.5l-3.6 7M8.6 7.85l6.8-.7" opacity="0.5" /></>,
  };
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={name === "graph" ? 1.3 : 1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {paths[name]}
    </svg>
  );
}
