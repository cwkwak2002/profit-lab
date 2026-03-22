"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/backtest", label: "전략 검증" },
  { href: "/benchmark/models", label: "AI 벤치마크", match: "/benchmark" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 text-sm">
      {links.map(({ href, label, match }) => {
        const active = pathname.startsWith(match ?? href);
        return (
          <Link
            key={href}
            href={href}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              active
                ? "text-foreground bg-accent"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
