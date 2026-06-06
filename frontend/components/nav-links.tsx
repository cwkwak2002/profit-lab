"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/backtest",         label: "Strategy Backtest", match: "/backtest" },
  { href: "/benchmark/models", label: "Live Benchmark",    match: "/benchmark" },
];

const BASE: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: 14,
  fontWeight: 500,
  color: "var(--px-grey-mid)",
  textDecoration: "none",
  padding: "6px 10px",
  borderRadius: 6,
  lineHeight: 1,
  display: "inline-block",
  transition: "color 0.15s ease",
};

const ACTIVE: React.CSSProperties = {
  ...BASE,
  color: "var(--px-white)",
};

const HOVER: React.CSSProperties = {
  ...BASE,
  color: "var(--px-white)",
};

export function NavLinks() {
  const pathname = usePathname();
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <nav style={{ display: "flex", gap: 16 }}>
      {links.map(({ href, label, match }) => {
        const active = pathname.startsWith(match);
        const style = active ? ACTIVE : hovered === href ? HOVER : BASE;
        return (
          <Link
            key={href}
            href={href}
            style={style}
            onMouseEnter={() => setHovered(href)}
            onMouseLeave={() => setHovered(null)}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
