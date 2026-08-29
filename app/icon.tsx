import { ImageResponse } from "next/og";

/**
 * The browser-tab favicon, generated at build time (no external image tool needed).
 * The mark echoes the 3D hero's globe: a signal-green orbit ring with a satellite
 * dot, on the same near-black ground `DeviceShowcase` uses (`#131c2c`) — the one
 * spot on the page dark enough that `signal` reads at full strength (see AGENTS.md's
 * contrast table). Pure shapes, no text glyphs, so there's no font to bundle.
 */
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#131c2c",
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            border: "3px solid #13C182",
            display: "flex",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -3,
              right: -3,
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#13C182",
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
