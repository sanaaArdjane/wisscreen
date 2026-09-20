import { ImageResponse } from "next/og";
import { SERVICES, getServiceBySlug } from "@/lib/data/services";
import { SITE_NAME } from "@/lib/site";

/** One share-card image per solution — same orbit motif and ground as the root
 *  `opengraph-image.tsx`, with that solution's own name/category/tagline. */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return SERVICES.map((service) => ({ slug: service.slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  const name = service?.name ?? SITE_NAME;
  const category = service?.category ?? "";
  const tagline = service?.tagline ?? "";

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
          style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "5px solid #13C182",
              display: "flex",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -5,
                right: -5,
                width: 13,
                height: 13,
                borderRadius: "50%",
                background: "#13C182",
              }}
            />
          </div>
          <div
            style={{
              fontSize: 24,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#4ED39D",
            }}
          >
            {SITE_NAME}
          </div>
        </div>
        <div
          style={{
            fontSize: 22,
            textTransform: "uppercase",
            letterSpacing: 2,
            color: "#7FC9C8",
            marginBottom: 12,
          }}
        >
          {category}
        </div>
        <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1 }}>{name}</div>
        <div
          style={{
            fontSize: 30,
            marginTop: 24,
            color: "rgba(255,255,255,0.75)",
            maxWidth: 880,
          }}
        >
          {tagline}
        </div>
      </div>
    ),
    { ...size },
  );
}
