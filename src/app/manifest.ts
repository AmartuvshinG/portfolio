import type { MetadataRoute } from "next";
import { site } from "@/lib/content";

export const dynamic = "force-static";

/* "Add to Home Screen" opens full-bleed on the void, under the name, with no
   browser chrome; the same ground the opening act paints. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.title,
    short_name: "Amartuvshin",
    description: site.description,
    start_url: "/",
    display: "standalone",
    background_color: "#061317",
    theme_color: "#061317",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/apple-icon.png", type: "image/png", sizes: "180x180" },
    ],
  };
}
