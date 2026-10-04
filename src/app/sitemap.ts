import type { MetadataRoute } from "next";
import { site } from "@/lib/content";

export const dynamic = "force-static";

/* One route; the Mongolian page is the same URL with a client-side switch. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${site.url}/`, changeFrequency: "monthly", priority: 1 }];
}
