import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

const SITE_URL = "https://mekar.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MEKAR — AI Genealogy & Royalty Protocol",
    template: "%s · MEKAR",
  },
  description:
    "Spotify-style royalty for AI agents on 0G. Every AI has a verifiable on-chain lineage. Every inference automatically pays its ancestors. Built on 0G's INFT (ERC-7857) primitive.",
  keywords: [
    "AI",
    "blockchain",
    "0G",
    "INFT",
    "royalty",
    "lineage",
    "ERC-7857",
    "Web 4.0",
    "AI agents",
    "agentic economy",
  ],
  authors: [{ name: "MEKAR Team" }],
  creator: "MEKAR",
  publisher: "MEKAR",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "MEKAR — AI Genealogy & Royalty Protocol",
    description:
      "Spotify-style royalty for AI agents on 0G. Every AI has a verifiable lineage; every inference pays its ancestors.",
    url: SITE_URL,
    siteName: "MEKAR",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og.svg",
        width: 1200,
        height: 630,
        alt: "MEKAR — Spotify royalty for AI agents on 0G",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MEKAR — AI Genealogy & Royalty Protocol",
    description:
      "Every AI has a lineage. Every inference pays its ancestors. Built on 0G.",
    images: ["/og.svg"],
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/icon.svg",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased min-h-screen`}
      >
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
