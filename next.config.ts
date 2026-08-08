import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  /* Morphs the work card into the case-file hero instead of cutting to it.
     Paired view-transition-names are set per slug in WorkCardGrid and
     work/[slug]; the animation is disabled under prefers-reduced-motion in
     globals.css. */
  experimental: { viewTransition: true },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
