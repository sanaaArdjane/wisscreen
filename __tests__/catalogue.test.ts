import { describe, expect, it } from "vitest";
import { formatLines, listLines, parseGrants, parseLines } from "@/lib/kv";
import { isStandingMetric } from "@/lib/quotas";

describe("catalogue line formats", () => {
  it("parses `Label : valeur` lines and ignores the rest", () => {
    expect(parseLines("vCPU : 4\nRAM: 8 Go\n\njunk line\nURL = https://x.dz")).toEqual({
      vCPU: "4",
      RAM: "8 Go",
      URL: "https://x.dz",
    });
  });

  it("round-trips through formatLines", () => {
    const spec = { vCPU: "4", RAM: "8 Go" };
    expect(parseLines(formatLines(spec))).toEqual(spec);
  });

  it("reads quota grants, including unlimited and French thousands", () => {
    expect(parseGrants("smtp.emails: 50 000\nai.requests: illimité")).toEqual({
      ok: true,
      grants: { "smtp.emails": 50000, "ai.requests": null },
    });
    expect(parseGrants("smtp.emails: beaucoup").ok).toBe(false);
    expect(parseGrants("bad metric!: 3").ok).toBe(false);
    expect(parseGrants("")).toEqual({ ok: true, grants: {} });
  });

  it("formats an unlimited grant so it parses back", () => {
    const text = formatLines({ "ai.requests": null, "sms.messages": 10 });
    expect(parseGrants(text)).toEqual({ ok: true, grants: { "ai.requests": null, "sms.messages": 10 } });
  });

  it("strips list markers from feature lines", () => {
    expect(listLines("- IPv4\n* Sauvegarde\n\n• SLA")).toEqual(["IPv4", "Sauvegarde", "SLA"]);
  });

  it("treats storage as a standing total, everything else as monthly", () => {
    expect(isStandingMetric("storage.mb")).toBe(true);
    expect(isStandingMetric("smtp.emails")).toBe(false);
  });
});
