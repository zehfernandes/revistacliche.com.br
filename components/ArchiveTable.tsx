"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDate } from "@/lib/format";
import type { Row } from "@/lib/content";

type Column = {
  key: string;
  label: string;
  value: (it: Row) => string | number;
  cell?: (it: Row, filter: (v: string) => void) => React.ReactNode;
  className?: string;
};

const pills = (values: string[], filter: (v: string) => void) =>
  values.map((v) => (
    <button key={v} className="pill" onClick={() => filter(v)}>
      {v}
    </button>
  ));

const title: Column = {
  key: "title",
  label: "Título",
  value: (it) => it.title,
  cell: (it) => (
    <Link href={it.path} className="row-link">
      {it.title}
    </Link>
  ),
  className: "title",
};
const date: Column = { key: "date", label: "Data", value: (it) => it.date, cell: (it) => formatDate(it.date), className: "muted num date" };

const COLUMNS: Record<"articles" | "podcasts", Column[]> = {
  articles: [
    title,
    {
      key: "author",
      label: "Autor",
      value: (it) => it.author.name,
      cell: (it) =>
        it.author.slug ? (
          <Link href={`/people/${it.author.slug}/`} className="cell-link">
            {it.author.name}
          </Link>
        ) : (
          it.author.name
        ),
      className: "wide",
    },
    { key: "series", label: "Série", value: (it) => it.series.join(), cell: (it, f) => pills(it.series, f), className: "wide" },
    { key: "filtro", label: "Filtro", value: (it) => it.filtro.join(), cell: (it, f) => pills(it.filtro, f), className: "wide" },
    date,
  ],
  podcasts: [
    { key: "episode", label: "#", value: (it) => it.episode ?? 0, cell: (it) => (it.episode ? `#${String(it.episode).padStart(2, "0")}` : "—"), className: "num strong ep" },
    title,
    {
      key: "participants",
      label: "Participantes",
      value: (it) => it.participants?.map((p) => p.name).join(", ") ?? "",
      cell: (it) =>
        it.participants?.map((p, i) => (
          <span key={p.slug}>
            {i > 0 && ", "}
            <Link href={`/people/${p.slug}/`} className="cell-link">
              {p.name}
            </Link>
          </span>
        )),
      className: "wide people",
    },
    { key: "duration", label: "Duração", value: (it) => it.duration ?? "", className: "muted num wide dur" },
    date,
  ],
};

export function ArchiveTable({ kind, items, label }: { kind: keyof typeof COLUMNS; items: Row[]; label: string }) {
  const columns = COLUMNS[kind];
  const [sort, setSort] = useState({ key: "date", dir: -1 });
  const [filter, setFilter] = useState<string | null>(null);
  const [active, setActive] = useState<Row | null>(null);
  const preview = useRef<HTMLImageElement>(null);
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setFilter(new URLSearchParams(location.search).get("filter"));
  }, []);

  const rows = useMemo(() => {
    const col = columns.find((c) => c.key === sort.key) ?? date;
    return items
      .filter((it) => !filter || [...it.series, ...it.filtro].includes(filter))
      .sort((a, b) => (col.value(a) > col.value(b) ? 1 : col.value(a) < col.value(b) ? -1 : 0) * sort.dir);
  }, [items, columns, sort, filter]);

  // Native :hover goes stale while scrolling under a still cursor; re-hit-test on scroll.
  useEffect(() => {
    const onScroll = () => {
      const row = document.elementFromPoint(pointer.current.x, pointer.current.y)?.closest("tr[data-index]");
      setActive(row ? rows[Number((row as HTMLElement).dataset.index)] : null);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [rows]);

  // Stable so memoized rows don't re-render when the hovered row changes.
  const applyFilter = useCallback((v: string | null) => {
    setFilter(v);
    const url = new URL(location.href);
    if (v) url.searchParams.set("filter", v);
    else url.searchParams.delete("filter");
    history.replaceState(null, "", url);
  }, []);

  function move(e: React.PointerEvent) {
    pointer.current = { x: e.clientX, y: e.clientY };
    preview.current?.style.setProperty("translate", `${e.clientX + 24}px ${e.clientY - 80}px`);
  }

  return (
    <div className="archive" onPointerMove={move} onPointerLeave={() => setActive(null)}>
      <div className="archive-head">
        <p>
          <strong>{label}</strong> · {rows.length} de {items.length}
        </p>
        {filter && (
          <button className="pill" onClick={() => applyFilter(null)}>
            {filter} ×
          </button>
        )}
      </div>
      <table>
        <thead>
          <tr>
            <th className="thumb" aria-hidden />
            {columns.map((c) => (
              <th key={c.key} className={c.className} aria-sort={sort.key === c.key ? (sort.dir > 0 ? "ascending" : "descending") : undefined}>
                <button onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key ? -s.dir : c.key === "date" ? -1 : 1 }))}>
                  {c.label}
                  {sort.key === c.key && <span className="arrow">{sort.dir > 0 ? " ↑" : " ↓"}</span>}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((it, i) => (
            <ArchiveRow key={it.id} it={it} index={i} active={active === it} columns={columns} onEnter={setActive} filter={applyFilter} />
          ))}
        </tbody>
      </table>
      <img ref={preview} className="preview" src={active?.cover ?? undefined} alt="" hidden={!active?.cover} />
    </div>
  );
}

// Memoized: hovering re-renders only the two rows whose `active` flips, not all ~530.
const ArchiveRow = memo(function ArchiveRow({
  it,
  index,
  active,
  columns,
  onEnter,
  filter,
}: {
  it: Row;
  index: number;
  active: boolean;
  columns: Column[];
  onEnter: (it: Row) => void;
  filter: (v: string) => void;
}) {
  return (
    <tr data-index={index} data-active={active || undefined} onPointerEnter={() => onEnter(it)}>
      <td className="thumb">{it.cover && <img src={it.cover} alt="" loading="lazy" />}</td>
      {columns.map((c) => (
        <td key={c.key} className={c.className}>
          {c.cell ? c.cell(it, filter) : c.value(it)}
        </td>
      ))}
    </tr>
  );
});
