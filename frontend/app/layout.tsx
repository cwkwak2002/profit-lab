import type { Metadata } from "next";
import { NavLinks } from "@/components/nav-links";
import { AuthButton } from "@/components/auth-button";
import { TickerTape } from "@/components/ticker-tape";
import { ThemeProvider } from "@/design-system/providers/theme-provider";
import { AuthProvider } from "@/design-system/providers/auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Profit Lab",
  description: "Crypto Futures Backtest Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="theme-pixel h-full antialiased">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Pretendard — 한글 최적화 산세리프 */}
        <link
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
          rel="stylesheet"
        />
        {/* Inter — Linear UI/타이틀/본문 + JetBrains Mono — 숫자/데이터 (Press Start 2P 잔존, 미사용) */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@300;400;500;600;700&family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
        {/* Material Symbols Outlined — 아이콘 */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body
        className="min-h-full flex flex-col text-foreground"
        style={{ background: "var(--px-black, #0a0a1a)", color: "var(--px-white, #f0f0ff)" }}
      >
        <ThemeProvider defaultTheme="theme-pixel">
         <AuthProvider>
          {/* ── HEADER ───────────────────────────────────────────────── */}
          <header
            className="sticky top-0 z-50 flex items-center justify-between px-6"
            style={{
              height: 56,
              background: "var(--px-black)",
              borderBottom: "1px solid var(--px-border)",
            }}
          >
            <a href="/" className="flex items-center gap-2 no-underline">
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: "-0.4px",
                  color: "var(--px-white)",
                  lineHeight: 1,
                }}
              >
                Profit Lab
              </span>
            </a>

            <NavLinks />

            <div className="flex items-center gap-4">
              <AuthButton />
            </div>
          </header>

          {/* ── TICKER TAPE ──────────────────────────────────────────── */}
          <TickerTape />

          <main className="flex-1 flex flex-col p-6" style={{ color: "var(--px-white, #f0f0ff)" }}>
            {children}
          </main>
         </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
