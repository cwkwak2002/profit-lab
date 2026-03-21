import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="border-b px-6 py-3 flex items-center gap-4">
          <h1 className="text-lg font-bold tracking-tight">Profit Lab</h1>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <a href="/backtest" className="hover:text-foreground transition-colors">Backtest</a>
          </nav>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </body>
    </html>
  );
}
