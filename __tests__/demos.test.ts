// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { decryptSecret, demoSecretAad, encryptSecret, encryptionConfigured } from "@/lib/crypto";
import {
  DemoBlockSchema,
  declaredSecrets,
  effectiveExpiry,
  isExpired,
  parseBlocks,
  resultSource,
  slugify,
} from "@/lib/demos";

describe("lib/crypto", () => {
  beforeAll(() => {
    process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");
  });

  it("round-trips a value under the same AAD", () => {
    const aad = demoSecretAad(1, "block-a", "Mot de passe");
    const blob = encryptSecret("s3cret!", aad);
    expect(blob.startsWith("v1:")).toBe(true);
    expect(blob).not.toContain("s3cret");
    expect(decryptSecret(blob, aad)).toBe("s3cret!");
  });

  it("refuses a ciphertext moved to another row", () => {
    const blob = encryptSecret("s3cret!", demoSecretAad(1, "block-a", "Mot de passe"));
    expect(() => decryptSecret(blob, demoSecretAad(2, "block-a", "Mot de passe"))).toThrow();
    expect(() => decryptSecret(blob, demoSecretAad(1, "block-b", "Mot de passe"))).toThrow();
  });

  it("uses a fresh IV every time", () => {
    const aad = demoSecretAad(1, "b", "l");
    expect(encryptSecret("x", aad)).not.toBe(encryptSecret("x", aad));
  });

  it("is off — never plaintext — without a valid key", () => {
    const saved = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = "too-short";
    expect(encryptionConfigured()).toBe(false);
    expect(() => encryptSecret("x", "a")).toThrow(/32 bytes/);
    delete process.env.ENCRYPTION_KEY;
    expect(encryptionConfigured()).toBe(false);
    process.env.ENCRYPTION_KEY = saved;
  });
});

describe("demo blocks", () => {
  const id = "00000000-0000-4000-8000-000000000001";

  it("accepts every kind and rejects a javascript: link", () => {
    expect(DemoBlockSchema.safeParse({ id, kind: "link", url: "https://demo.example.com" }).success).toBe(true);
    expect(DemoBlockSchema.safeParse({ id, kind: "link", url: "javascript:alert(1)" }).success).toBe(false);
    expect(
      DemoBlockSchema.safeParse({ id, kind: "ssh", host: "h", username: "u", auth: "key" }).success,
    ).toBe(true);
    expect(DemoBlockSchema.safeParse({ id, kind: "nope" }).success).toBe(false);
  });

  it("declares secrets from credentials rows and SSH blocks, by block id", () => {
    const blocks = parseBlocks([
      { id: "a1234567", kind: "credentials", fields: [{ label: "Login", value: "demo" }, { label: "Mot de passe", secret: true }] },
      { id: "b1234567", kind: "ssh", host: "h", username: "u", auth: "password" },
      { id: "c1234567", kind: "ssh", host: "h", username: "u", auth: "none" },
    ]);
    expect(declaredSecrets(blocks)).toEqual([
      { blockId: "a1234567", label: "Mot de passe" },
      { blockId: "b1234567", label: "ssh" },
    ]);
  });

  it("drops a stored block that no longer fits instead of failing the page", () => {
    expect(parseBlocks([{ id, kind: "markdown", body: "ok" }, { kind: "broken" }, null])).toHaveLength(1);
    expect(parseBlocks("not an array")).toEqual([]);
  });

  it("reads legacy simulator results as simulated", () => {
    expect(resultSource({ simulated: true })).toBe("simulated");
    expect(resultSource({})).toBe("simulated");
    expect(resultSource({ source: "manual" })).toBe("manual");
  });

  it("takes the earliest expiry, and ignores the missing ones", () => {
    const a = new Date("2026-10-01");
    const b = new Date("2026-09-25");
    expect(effectiveExpiry(a, null, b, undefined)).toEqual(b);
    expect(effectiveExpiry(null, undefined)).toBeNull();
    expect(isExpired(b, new Date("2026-09-26"))).toBe(true);
    expect(isExpired(null, new Date())).toBe(false);
  });

  it("slugifies French titles", () => {
    expect(slugify("Démo SETYCORE — espace marchand")).toBe("demo-setycore-espace-marchand");
  });
});
