import type { Metadata } from "next";
import { NavLinks } from "@/components/nav-links";
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
    <html
      lang="ko"
      className="dark h-full antialiased"
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@300..700&family=Noto+Sans+KR:wght@300..700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="sticky top-0 z-50 h-14 border-b border-border/60 bg-background/80 backdrop-blur-sm px-6 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <a href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
              <img src="/logo.svg" alt="Profit Lab" className="w-7 h-7" />
              <span><span className="text-[#d0d4dc]">Profit</span> <span className="text-[#7a8194]">Lab</span></span>
            </a>
            <NavLinks />
          </div>
          <span className="text-xs text-muted-foreground">v{process.env.APP_VERSION}</span>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </body>
    </html>
  );
}
