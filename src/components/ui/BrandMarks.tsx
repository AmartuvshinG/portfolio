/* eslint-disable @next/next/no-img-element -- a fixed-size brand asset; next/image would only add a resize round-trip */

/**
 * Third-party brand marks, used only to link to the owner's own profiles on
 * those services — the use both companies' guidelines allow.
 *
 * Both marks are the **unmodified official artwork**, in the single-colour white
 * variant each brand publishes. That is also why they are white and not ramp-
 * tinted: recolouring a trademark is the one thing both guidelines forbid, and
 * white is the variant this site's palette can take without breaking its own
 * gradient-only rule. Never scale them non-uniformly, crop them, add effects to
 * the glyph itself, or place anything inside their clear space.
 *
 * Credited in the footer's bottom bar (`ui.footer.credit`, in both languages).
 * If either mark is ever replaced, re-take
 * it from the source below rather than redrawing it.
 *
 * - GitHub Invertocat — `mark-github` from GitHub's own Octicons
 *   (`@primer/octicons`, build/svg/mark-github-24.svg). Drawn as inline SVG so
 *   it stays vector at any panel size.
 * - LinkedIn "In" bug — `InBug-White.png` from the official in-logo package at
 *   brand.linkedin.com/downloads (840×779, ® included). LinkedIn ships it as a
 *   raster only, so it is served as-is from `/brand/`.
 */

export function GitHubMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="#ffffff"
      className={className}
    >
      <path d="M10.226 17.284c-2.965-.36-5.054-2.493-5.054-5.256 0-1.123.404-2.336 1.078-3.144-.292-.741-.247-2.314.09-2.965.898-.112 2.111.36 2.83 1.01.853-.269 1.752-.404 2.853-.404 1.1 0 1.999.135 2.807.382.696-.629 1.932-1.1 2.83-.988.315.606.36 2.179.067 2.942.72.854 1.101 2 1.101 3.167 0 2.763-2.089 4.852-5.098 5.234.763.494 1.28 1.572 1.28 2.807v2.336c0 .674.561 1.056 1.235.786 4.066-1.55 7.255-5.615 7.255-10.646C23.5 6.188 18.334 1 11.978 1 5.62 1 .5 6.188.5 12.545c0 4.986 3.167 9.12 7.435 10.669.606.225 1.19-.18 1.19-.786V20.63a2.9 2.9 0 0 1-1.078.224c-1.483 0-2.359-.808-2.987-2.313-.247-.607-.517-.966-1.034-1.033-.27-.023-.359-.135-.359-.27 0-.27.45-.471.898-.471.652 0 1.213.404 1.797 1.235.45.651.921.943 1.483.943.561 0 .92-.202 1.437-.719.382-.381.674-.718.944-.943" />
    </svg>
  );
}

export function LinkedInMark({ className }: { className?: string }) {
  return (
    <img
      src="/brand/linkedin-inbug-white.png"
      alt=""
      aria-hidden
      width={840}
      height={779}
      className={className}
      draggable={false}
    />
  );
}
