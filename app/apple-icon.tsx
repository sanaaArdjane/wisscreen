import { ImageResponse } from "next/og";

/** Same mark as `app/icon.tsx`, scaled up for iOS's home-screen icon size. iOS masks
 *  its own rounded-square shape over this, so the background stays a plain square. */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
            width: 100,
            height: 100,
            borderRadius: "50%",
            border: "16px solid #13C182",
            display: "flex",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -16,
              right: -16,
              width: 40,
              height: 40,
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
