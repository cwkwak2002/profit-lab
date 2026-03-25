"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/backtest",         label: "▶ 전략 검증",   match: "/backtest" },
  { href: "/benchmark/models", label: "★ AI 벤치마크", match: "/benchmark" },
];

const BASE: React.CSSProperties = {
  fontFamily: "var(--font-pixel), monospace",
  fontSize: 8,
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
  borderColor: "var(--px-cyan)",
  background: "rgba(0,238,255,0.1)",
  color: "#fff",
};

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav style={{ display: "flex", gap: 16 }}>
      {links.map(({ href, label, match }) => {
        const active = pathname.startsWith(match);
        return (
          <Link key={href} href={href} style={active ? ACTIVE : BASE}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
