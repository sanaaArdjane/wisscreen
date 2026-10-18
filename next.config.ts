import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle (`.next/standalone`) so the Docker runtime
  // image only ships the traced runtime deps + `server.js`, not the whole node_modules.
  // See node_modules/next/dist/docs/01-app/02-guides/self-hosting.md.
  output: "standalone",
  images: {
    // AVIF first, WebP second: Next picks the first the browser accepts, and both beat
    // the JPEG/PNG sources by enough to matter on a site served straight off its origin.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },

  /**
   * Caching for `public/`.
   *
   * There is no CDN in front of this app: `server.js` serves every byte of `public/`
   * itself. Next sets long-lived immutable caching on `/_next/static` — whose filenames
   * carry a build hash — but `public/` gets no such treatment, because Next cannot know
   * whether a given file's name is content-addressed.
   *
   * Ours effectively are: an asset under `/photos` or `/videos` is replaced by *adding a
   * file and repointing `lib/data/media.ts`*, not by overwriting bytes under an existing
   * name — see the note on `revealVideo`, whose filename carries its resolution for this
   * exact reason. That convention is what makes `immutable` safe here, so it is written
   * down rather than assumed: **if you ever overwrite an asset in place, change its name
   * too, or returning visitors will keep the old bytes for a year.**
   */
  async headers() {
    return [
      {
        source: "/:dir(photos|videos)/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
