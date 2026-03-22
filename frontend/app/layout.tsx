import type { Metadata } from "next";
import { Geist_Mono, Noto_Sans_KR } from "next/font/google";
import { NavLinks } from "@/components/nav-links";
import "./globals.css";

const notoSansKR = Noto_Sans_KR({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      className={`dark ${notoSansKR.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="sticky top-0 z-50 h-14 border-b border-border/60 bg-background/80 backdrop-blur-sm px-6 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <a href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
              <img src="/logo.svg" alt="Profit Lab" className="w-7 h-7" />
              <span><span className="text-[#d0d4dc]">Profit</span> <span className="text-[#7a8194]">Lab</span></span>
            </a>
            <NavLinks />
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </body>
    </html>
  );
}
