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
  title: {
    default: "PlaytestAI",
    template: "%s | PlaytestAI",
  },
  description: "AI-powered board game playtesting and balance analysis platform. Simulate thousands of matches, spot broken openers, and compare balance variants.",
  keywords: ["board game", "playtesting", "balance", "simulation", "AI", "game design", "card game"],
  authors: [{ name: "PlaytestAI" }],
  openGraph: {
    title: "PlaytestAI",
    description: "AI-powered board game playtesting and balance analysis",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark`}>
      <body className="min-h-screen bg-[#060816] text-slate-100 antialiased">
        <a
          href="#main-content"
          className="sr-only fixed left-4 top-4 z-50 rounded-full bg-cyan-400 px-4 py-2 font-medium text-slate-950 focus:not-sr-only"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
