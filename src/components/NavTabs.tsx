"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/home", label: "Home" },
  { href: "/discover", label: "Discover" },
  { href: "/outreach", label: "Outreach" },
  { href: "/tracker", label: "Tracker" },
  { href: "/settings", label: "Settings" },
];

export function NavTabs() {
  const path = usePathname();
  return (
    <nav className="hidden md:flex items-center gap-1 bg-stone-100 border border-stone-200 rounded-full p-1">
      {TABS.map((t) => {
        const active = path === t.href || path?.startsWith(t.href + "/");
        return (
          <Link
            key={t.href}
            href={t.href}
            className={
              "px-3.5 py-1.5 text-sm rounded-full transition " +
              (active ? "bg-slate-900 text-stone-50" : "text-slate-600 hover:text-slate-900")
            }
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
