"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/backtest",         label: "▶ Strategy Backtest", match: "/backtest" },
  { href: "/benchmark/models", label: "★ Live Benchmark",    match: "/benchmark" },
];

const BASE: React.CSSProperties = {
  fontFamily: "var(--font-pixel), monospace",
  fontSize: 16,
  color: "var(--px-cyan)",
  textDecoration: "none",
  padding: "4px 10px",
  border: "2px solid transparent",
  lineHeight: 1,
  display: "inline-block",
  transition: "all 0.1s steps(1)",
};

const ACTIVE: React.CSSProperties = {
  ...BASE,
};

const HOVER: React.CSSProperties = {
  ...BASE,
  color: "#fff",
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
