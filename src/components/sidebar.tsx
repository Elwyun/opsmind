"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Overview" },
  { href: "/investigations", label: "Investigations" },
  { href: "/actions", label: "Actions" },
  { href: "/data", label: "Data" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <strong>OpsMind</strong>
        <span>AI Operational Intelligence</span>
      </div>

      <nav className="sidebar-nav" aria-label="Main sections">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} data-active={isActive}>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <p className="sidebar-footnote">
        Numbers are calculated by the app, not by the model. AI output suggests what to check; a
        human decides what to do.
      </p>
    </aside>
  );
}
