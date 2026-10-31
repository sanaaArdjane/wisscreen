import { ImageResponse } from "next/og";
import { getSolution, getSolutions } from "@/lib/content";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/** One share-card image per solution — same orbit motif and ground as the root
 *  `opengraph-image.tsx`, with that solution's own name/category/tagline. */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Reads editable content, so it cannot stay frozen on the build. Same reasoning as
 *  `app/manifest.ts`: a file-convention route has no cache tag for `updateTag` to hit. */
export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getSolutions()).map((service) => ({ slug: service.slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = await getSolution(slug);

  /*
   * A custom share card is served **from here**, not declared in `generateMetadata`.
   *
   * Next's file convention and an explicit `openGraph.images` do not replace one
   * another — it emits both, and the page ships two `og:image` tags for scrapers to
   * disagree over. Serving the owner's image as this route's response keeps exactly
   * one tag, pointing at exactly one URL, whichever image is behind it.
   */
  const custom = service?.seo?.ogImage;
  if (custom) {
    const url = custom.startsWith("http") ? custom : `${SITE_URL}${custom}`;
    const upstream = await fetch(url);
    // A broken link falls through to the generated card rather than to a dead image.
    if (upstream.ok) {
      return new Response(upstream.body, {
        headers: {
          "Content-Type": upstream.headers.get("content-type") ?? "image/png",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }
  }

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
          background: "#FFFFFF",
          color: "#354666",
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
              border: "5px solid #1099A5",
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
                background: "#1099A5",
              }}
            />
          </div>
          <div
            style={{
              fontSize: 24,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#0E6F78",
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
            color: "#0E6F78",
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
            color: "#366479",
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
