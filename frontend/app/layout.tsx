import type { Metadata } from "next";
import { NavLinks } from "@/components/nav-links";
import { PixelCoin } from "@/components/pixel-coin";
import { TickerTape } from "@/components/ticker-tape";
import { ThemeProvider } from "@/design-system/providers/theme-provider";
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
        {/* JetBrains Mono — 숫자/데이터용 모노스페이스 + Press Start 2P — 픽셀 레트로 타이틀 */}
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Press+Start+2P&display=swap"
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
          {/* ── HEADER ───────────────────────────────────────────────── */}
          <header
            className="sticky top-0 z-50 flex items-center justify-between px-6"
            style={{
              height: 52,
              background: "var(--px-panel-alt)",
              borderBottom: "3px solid var(--px-border)",
              boxShadow: "0 2px 0 rgba(51,85,255,0.25)",
            }}
          >
            <a href="/" className="flex items-center gap-3 no-underline">
              <PixelCoin size={24} />
              <span
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 13,
                  letterSpacing: 2,
                  color: "var(--px-yellow)",
                  textShadow: "2px 2px 0 #886600, 4px 4px 0 #443300",
                  lineHeight: 1,
                }}
              >
                PROFIT LAB
              </span>
            </a>

            <NavLinks />

            <div
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 8,
                color: "#ff3333",
                letterSpacing: 1,
                lineHeight: 1,
              }}
            >
              ♥ ♥ ♥
            </div>
          </header>

          {/* ── TICKER TAPE ──────────────────────────────────────────── */}
          <TickerTape />

          <main className="flex-1 flex flex-col p-6" style={{ color: "var(--px-white, #f0f0ff)" }}>
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
