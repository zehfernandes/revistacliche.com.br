import Link from "next/link";
import { Graph } from "./Graph";
import { Nav, NAV } from "./Nav";
import { Views } from "./Views";

export type Crumb = { label: string; href?: string };

export function Frame({
  crumbs,
  detail,
  active,
  focus = [],
  children,
}: {
  crumbs: Crumb[];
  detail?: string;
  active?: (typeof NAV)[number][0];
  focus?: string[]; // people of this page, highlighted in the graph
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="header">
        <nav className="crumbs" aria-label="Você está em">
          <Link href="/" aria-label="Revista Cliche">
            <img className="logo" src="/brand/logo-cliche.png" alt="" />
          </Link>
          {[{ label: "Revista Cliche", href: "/" }, ...crumbs].map((c, i) => (
            <span key={i}>
              {i > 0 && <span className="sep" aria-hidden>|</span>}
              {c.href ? <Link href={c.href}>{c.label}</Link> : c.label}
            </span>
          ))}
          {detail && <span className="detail">{detail}</span>}
        </nav>
        <Nav active={active} />
      </header>
      <Views graph={<Graph focus={focus} />}>
        {children}
      </Views>
    </>
  );
}
