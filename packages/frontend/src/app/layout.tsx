import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, JetBrains_Mono, Manrope } from "next/font/google";
import { Providers } from "./providers";
import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const body = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
  display: "swap",
});

const SITE_URL = "https://mekar.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Mekar — Every AI has a lineage",
    template: "%s · Mekar",
  },
  description:
    "Mekar is a public ledger of AI parentage on the 0G network. Every agent has a lineage; every inference pays its ancestors.",
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
  alternates: { canonical: "/" },
  openGraph: {
    title: "Mekar — Every AI has a lineage",
    description:
      "A public ledger of AI parentage on the 0G network. Every inference pays its ancestors.",
    url: SITE_URL,
    siteName: "Mekar",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og.svg",
        width: 1200,
        height: 630,
        alt: "Mekar — every AI has a lineage",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mekar — Every AI has a lineage",
    description: "A public ledger of AI parentage on the 0G network.",
    images: ["/og.svg"],
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/icon.svg",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#f7f1e6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased min-h-screen">
        <Providers>
          <ErrorBoundary>{children}</ErrorBoundary>
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
