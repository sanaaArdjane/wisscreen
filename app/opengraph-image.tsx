import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";

/** Default share-card image — used for the homepage and as the fallback anywhere a
 *  route doesn't declare its own (Next also serves this for Twitter/X's card when no
 *  `twitter-image` file exists). Same orbit motif as the favicon, at 1200×630. */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#131c2c",
          color: "#FFFFFF",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "6px solid #13C182",
              display: "flex",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "#13C182",
              }}
            />
          </div>
          <div
            style={{
              fontSize: 28,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#4ED39D",
            }}
          >
            {SITE_NAME}
          </div>
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1, maxWidth: 920 }}>
          Solutions IT pour banques, entreprises et particuliers
        </div>
        <div
          style={{
            fontSize: 28,
            marginTop: 28,
            color: "rgba(255,255,255,0.75)",
            maxWidth: 860,
          }}
        >
          {SITE_DESCRIPTION}
        </div>
      </div>
    ),
    { ...size },
  );
}
