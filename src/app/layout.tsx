import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Archivo, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/content";
import { SmoothScroll } from "@/components/layout/SmoothScroll";
import { ActTheme } from "@/components/layout/ActTheme";
import { Preloader } from "@/components/layout/Preloader";
import { ChapterFrame } from "@/components/hud/ChapterFrame";
import { HudCursor } from "@/components/hud/HudCursor";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

/** Editorial display serif — the one non-grotesk voice on the site. */
const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});

/** Variable grotesk. Body copy at 400–500, oversized display caps at 900. */
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

/** The only survivor of the HUD vocabulary: micro-labels and numbering. */
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
  /* Matches the opening act. The browser chrome should agree with the ground,
     not with a dark theme the site no longer has. */
  themeColor: "#05060d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      /* Seeded to the opening act so first paint is already the base void — waiting for
         ActTheme to mount would flash the wrong surface. */
      data-act="void"
      className={`${instrument.variable} ${archivo.variable} ${monoHud.variable} h-full`}
    >
      <body className="min-h-full antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:bg-void focus:px-4 focus:py-2 focus:font-mono focus:text-xs focus:text-fg"
        >
          Skip to content
        </a>

        {/* Everything lives inside SmoothScroll: overlays that freeze the page
            (preloader, project dossier) need the Lenis-aware scroll lock from
            its context, which a sibling can't reach. */}
        <SmoothScroll>
          <ActTheme />
          <Preloader />
          <HudCursor />

          <Navbar />
          <ChapterFrame />
          <main id="main">{children}</main>
          <Footer />
        </SmoothScroll>
      </body>
    </html>
  );
}
