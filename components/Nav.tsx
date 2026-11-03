"use client";

import Link from "next/link";
import { useRef } from "react";

export const NAV = [
  ["Sobre", "/about/"],
  ["Volumes", "/volumes/"],
  ["Podcasts", "/podcasts/"],
  ["Artigos", "/articles/"],
  ["Palestras", "/talks/"],
] as const;

// Inline links on desktop; on mobile the same <nav> is a popover opened by the hamburger (globals.css).
// Client-side navigation keeps the header mounted, so a tapped link closes the popover itself.
export function Nav({ active }: { active?: (typeof NAV)[number][0] }) {
  const menu = useRef<HTMLElement>(null);
  return (
    <>
      <button className="menu-btn" popoverTarget="menu" aria-label="Menu">
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
          <path d="M2 5h16M2 10h16M2 15h16" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>
      <nav className="nav" id="menu" popover="auto" ref={menu} onClick={(e) => (e.target as Element).closest("a") && menu.current?.hidePopover()}>
        {NAV.map(([label, href]) => (
          <Link key={href} href={href} aria-current={label === active ? "page" : undefined}>
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
