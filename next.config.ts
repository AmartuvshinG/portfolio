import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* A static export, served from Cloudflare Workers Static Assets (see
     wrangler.jsonc). There is no server at request time: the GitHub numbers are
     fetched at build, and a daily scheduled deploy keeps them fresh. */
  output: "export",
  reactCompiler: true,
  /* Morphs the work card into the case-file hero instead of cutting to it.
     Paired view-transition-names are set per slug in WorkCardGrid and
     work/[slug]; the animation is disabled under prefers-reduced-motion in
     globals.css. */
  experimental: { viewTransition: true },
  images: {
    /* Widths are baked at build by scripts/bake-images.mjs; the loader picks
       one. deviceSizes must match WIDTHS in both of those files. */
    loader: "custom",
    loaderFile: "./src/lib/imageLoader.ts",
    deviceSizes: [640, 960, 1280, 1920],
    imageSizes: [],
  },
};

export default nextConfig;
