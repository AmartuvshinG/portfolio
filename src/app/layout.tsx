import type { Metadata, Viewport } from "next";
import {
  Michroma,
  Chakra_Petch,
  Archivo,
  JetBrains_Mono,
  Montserrat,
  Exo_2,
  Onest,
} from "next/font/google";
import "./globals.css";
import { site } from "@/lib/content";
import { SmoothScroll } from "@/components/chrome/SmoothScroll";
import { LocaleProvider } from "@/lib/i18n";
import { ActTheme } from "@/components/chrome/ActTheme";
import { SiteBackdrop } from "@/components/backdrop/SiteBackdrop";
import { Preloader } from "@/components/chrome/Preloader";
import { ChapterFrame } from "@/components/chrome/ChapterFrame";
import { HudCursor } from "@/components/chrome/HudCursor";
import { Navbar } from "@/components/chrome/Navbar";
import { CommandPalette } from "@/components/chrome/CommandPalette";
import { ChapterKeys } from "@/components/chrome/ChapterKeys";
import { Footer } from "@/components/chrome/Footer";
import { LiquidGlassFilter } from "@/components/ui/LiquidGlassFilter";

/**
 * The display face: wide, square, one weight. Wordmark and section titles only.
 * Michroma has no lowercase worth using and no second weight, which is exactly
 * why it works at 13vw and fails at 1rem — see `.display-caps` in globals.css
 * for the three values it needs to not break.
 */
const michroma = Michroma({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-michroma",
  display: "swap",
});

/**
 * The working voice. Chakra Petch's terminals are chamfered — the same cut as
 * the notch cards and the navbar console — so headings and leads carry the
 * site's geometry without shouting like the display face.
 */
const chakra = Chakra_Petch({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-chakra",
  display: "swap",
});

/** Body copy. Neither display face is readable at paragraph scale. */
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

/** The only survivor of the HUD vocabulary: micro-labels and numbering.
    `cyrillic` too: in Mongolian the labels keep this face, which has it. */
const monoHud = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-mono-hud",
  display: "swap",
});

/* --- The Mongolian faces.
   Michroma, Chakra Petch and Archivo have no Cyrillic at all, so in Mongolian
   every heading and paragraph would fall back to a system font. Each voice gets
   a Cyrillic counterpart chosen for the same job, swapped in by
   `:root:lang(mn)` in globals.css:

     display  Michroma      → Montserrat  wide geometric caps (Unbounded was
                                          tried first and has no Ө or Ү at all
                                          — those two fell back to Arial,
                                          mid-word)
     tech     Chakra Petch  → Exo 2       squared, technical, standard Cyrillic
                                          forms (Tektur was tried first: its д
                                          is the g-shaped Bulgarian form, and
                                          "дохиог" read as "gохиог")
     sans     Archivo       → Onest       a Cyrillic-first grotesque for body

   `cyrillic-ext` is not optional: Ө and Ү, which Mongolian uses constantly,
   live there, not in the basic Cyrillic block. And a face *advertising*
   cyrillic-ext is not proof it draws them — check with
   `CSS.getPlatformFontsForNode`, not `document.fonts.check`, which only
   confirms that a face covering the range has loaded. `preload: false` so English
   visitors never download them; the browser fetches them only once `lang`
   flips and the faces are actually used. */
const montserrat = Montserrat({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  variable: "--font-montserrat",
  display: "swap",
  preload: false,
});

/* No `weight` list: Exo 2 is variable, one file covers every weight — and an
   explicit list made Turbopack's font resolver fail outright. */
const exo = Exo_2({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  variable: "--font-exo",
  display: "swap",
  preload: false,
});

const onest = Onest({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  variable: "--font-onest",
  display: "swap",
  preload: false,
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
      className={`${michroma.variable} ${chakra.variable} ${archivo.variable} ${monoHud.variable} ${montserrat.variable} ${exo.variable} ${onest.variable} h-full`}
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
          <LocaleProvider>
            <ActTheme />

            {/* The single background for the whole document. Mounted here rather
                than per-section on purpose — see SiteBackdrop's header. Sections
                are transparent and sit at z-10 over it. */}
            <SiteBackdrop />
            <LiquidGlassFilter />

            <Preloader />
            <HudCursor />

            <Navbar />
            <ChapterFrame />

            {/* Keyboard surfaces. Both headless, both stand down while a field
                has focus or an overlay is open. */}
            <CommandPalette />
            <ChapterKeys />
            <main id="main" className="relative z-10">
              {children}
            </main>
            <Footer />
          </LocaleProvider>
        </SmoothScroll>
      </body>
    </html>
  );
}
