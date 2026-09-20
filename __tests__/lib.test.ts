import { describe, expect, it } from "vitest";

import { sourceMatches } from "@/app/api/preview-status/route";
import { cn } from "@/lib/cn";
import { SOLUTION_MEDIA, withMedia } from "@/lib/data/media";
import { SERVICES } from "@/lib/data/services";
import type { PaletteToken, Service } from "@/lib/types";

const PALETTE_TOKENS: PaletteToken[] = ["teal", "aqua", "steel"];

describe("cn", () => {
  it("joins truthy class names with a single space", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("drops every falsy value", () => {
    expect(cn("a", false, null, undefined, "", "b")).toBe("a b");
  });

  it("returns an empty string when nothing is truthy", () => {
    expect(cn(false, null, undefined)).toBe("");
  });
});

describe("SERVICES", () => {
  it("has at least one solution", () => {
    expect(SERVICES.length).toBeGreaterThan(0);
  });

  it("keeps every slug unique (generateStaticParams relies on this)", () => {
    const slugs = SERVICES.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("gives every solution the fields the homepage and solution pages read", () => {
    for (const s of SERVICES) {
      expect(s.slug, "slug").toBeTruthy();
      expect(s.name, `${s.slug}.name`).toBeTruthy();
      expect(s.media.gallery.length, `${s.slug}.media.gallery`).toBeGreaterThan(0);
      expect(PALETTE_TOKENS, `${s.slug}.palette.primary`).toContain(s.palette.primary);
      expect(PALETTE_TOKENS, `${s.slug}.palette.secondary`).toContain(s.palette.secondary);
    }
  });
});

describe("withMedia", () => {
  it("returns the service untouched when its slug has no media entry", () => {
    const svc = {
      slug: "__not-a-real-slug__",
      media: { hero: { kind: "mock-dashboard", label: "x" }, gallery: [] },
    } as unknown as Service;

    expect(withMedia(svc)).toBe(svc);
  });

  it("switches a solution to the image highlight layout wherever a highlight photo is registered", () => {
    // Wiring invariant, not a value assertion: supplying `highlight` in the media registry
    // must set both `highlightImage` and `highlightVariant: "image"` on the built service.
    for (const [slug, media] of Object.entries(SOLUTION_MEDIA)) {
      if (!media.highlight) continue;
      const built = SERVICES.find((s) => s.slug === slug);
      expect(built, `service for ${slug}`).toBeDefined();
      expect(built?.highlightVariant, `${slug}.highlightVariant`).toBe("image");
      expect(built?.highlightImage, `${slug}.highlightImage`).toBe(media.highlight);
    }
  });
});

describe("sourceMatches (CSP frame-ancestors)", () => {
  const self = "https://wissal.example";

  it("matches an exact host, with or without a scheme", () => {
    expect(sourceMatches("wissal.example", self, self)).toBe(true);
    expect(sourceMatches("https://wissal.example", self, self)).toBe(true);
    expect(sourceMatches("other.example", self, self)).toBe(false);
  });

  it("treats a wildcard as subdomains only, never the bare host", () => {
    expect(sourceMatches("*.example", "https://wissal.example", self)).toBe(true);
    expect(sourceMatches("*.wissal.example", "https://wissal.example", self)).toBe(false);
  });

  it("honours the keywords", () => {
    expect(sourceMatches("*", self, self)).toBe(true);
    expect(sourceMatches("'none'", self, self)).toBe(false);
    expect(sourceMatches("'self'", self, self)).toBe(true);
    expect(sourceMatches("'self'", self, "https://other.example")).toBe(false);
  });

  it("requires the scheme to agree", () => {
    expect(sourceMatches("http://wissal.example", self, self)).toBe(false);
  });
});
