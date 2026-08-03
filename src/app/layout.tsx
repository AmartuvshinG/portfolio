import type { Metadata, Viewport } from "next";
import { Saira_Condensed, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/content";
import { SmoothScroll } from "@/components/layout/SmoothScroll";
import { PosterReveal } from "@/components/layout/PosterReveal";
import { AmbientOverlay } from "@/components/layout/AmbientOverlay";
import { HudCursor } from "@/components/hud/HudCursor";
import { ConsoleDock } from "@/components/layout/ConsoleDock";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const saira = Saira_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-saira",
  display: "swap",
});

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
  display: "swap",
});

const monoHud = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-hud",
  display: "swap",
});

export const metadata: Metadata = {
  title: site.title,
  description: site.description,
  metadataBase: new URL(site.url),
  openGraph: {
    title: site.title,
    description: site.description,
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${saira.variable} ${grotesk.variable} ${monoHud.variable} h-full`}
    >
      <body className="min-h-full antialiased">
        <a
          href="#main"
          className="sr-only rounded-none focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:bg-cyan focus:px-4 focus:py-2 focus:font-mono focus:text-xs focus:text-bg"
        >
          Skip to content
        </a>

        {/* Everything lives inside SmoothScroll: overlays that freeze the page
            (boot poster, project dossier) need the Lenis-aware scroll lock from
            its context, which a sibling can't reach. */}
        <SmoothScroll>
          <PosterReveal />
          <AmbientOverlay />
          <HudCursor />

          <Navbar />
          <main id="main">{children}</main>
          <Footer />
          <ConsoleDock />
        </SmoothScroll>
      </body>
    </html>
  );
}
