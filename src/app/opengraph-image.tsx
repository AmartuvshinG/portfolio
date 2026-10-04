import { ImageResponse } from "next/og";
import { profile } from "@/lib/content";

/**
 * The card a link unfurls into (LinkedIn, Telegram, Slack, X).
 *
 * Built from the same content as the page, in the site's own vocabulary: the
 * void ground, an aurora wash in the three spectrum stops, the name set wide,
 * and one ramp rule. Satori (what ImageResponse renders with) supports flex and
 * gradients but not background-clip text, so the ramp lives in the rule and the
 * wash, never in the type.
 */

/* Rendered once at build into the static export. */
export const dynamic = "force-static";

export const alt = `${profile.fullName} — ${profile.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          color: "#e4f1f3",
          background:
            "radial-gradient(60% 80% at 12% 18%, rgba(255,59,48,0.32), transparent 70%)," +
            "radial-gradient(55% 75% at 58% 40%, rgba(255,138,107,0.30), transparent 70%)," +
            "radial-gradient(50% 70% at 92% 88%, rgba(159,227,236,0.22), transparent 70%)," +
            "#061317",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 24, letterSpacing: 6, color: "#93adb4" }}>
          {profile.kicker}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 104, fontWeight: 700, letterSpacing: 4, lineHeight: 1 }}>
            {profile.wordmark}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              height: 4,
              width: 420,
              backgroundImage: "linear-gradient(90deg, #ff3b30, #ff8a6b, #9fe3ec)",
            }}
          />
          <div style={{ display: "flex", marginTop: 32, fontSize: 34, fontWeight: 600 }}>
            {profile.role} · {profile.discipline}
          </div>
          <div style={{ display: "flex", marginTop: 16, fontSize: 28, color: "#b5ccd1", maxWidth: 980 }}>
            Built Spotfixes — AI bug triage trained on 222,000+ Mozilla Firefox bugs.
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 40, fontSize: 20, color: "#93adb4", letterSpacing: 2 }}>
          <span>{profile.location}</span>
          <span>{profile.status.toLowerCase()}</span>
        </div>
      </div>
    ),
    size
  );
}
