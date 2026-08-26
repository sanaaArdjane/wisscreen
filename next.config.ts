import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle (`.next/standalone`) so the Docker runtime
  // image only ships the traced runtime deps + `server.js`, not the whole node_modules.
  // See node_modules/next/dist/docs/01-app/02-guides/self-hosting.md.
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.apple.com",
        pathname: "/v/macbook-pro/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.example.com",
        pathname: "/assets/**",
      },
    ],
  },
};

export default nextConfig;
