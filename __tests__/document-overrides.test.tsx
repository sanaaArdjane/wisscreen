import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DEFAULT_COMPANY, effectiveCompany, parseOverrides } from "@/lib/company";
import { DocumentPreview, type PreviewDoc } from "@/components/dashboard/billing/DocumentPreview";

beforeAll(() => {
  // jsdom has no ResizeObserver; the preview only uses it to scale the page.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});
afterEach(cleanup);

const base = { ...DEFAULT_COMPANY, name: "WICLOUD", rc: "16/00-111", nif: "0021", vatRate: 19, bank: "BNA" };

describe("per-document company overrides", () => {
  it("falls back to Paramètres for absent keys and wins when present", () => {
    const c = effectiveCompany(base, { rc: "16/00-999", vatRate: 0 });
    expect(c.rc).toBe("16/00-999");
    expect(c.vatRate).toBe(0);
    expect(c.nif).toBe("0021");
    expect(c.bank).toBe("BNA");
  });

  it("lets an empty string blank a line on one document", () => {
    expect(effectiveCompany(base, { bank: "" }).bank).toBe("");
  });

  it("validates the editor's JSON", () => {
    expect(parseOverrides(JSON.stringify({ nif: "123", vatRate: 9 }))).toEqual({
      ok: true,
      overrides: { nif: "123", vatRate: 9 },
    });
    expect(parseOverrides("{not json").ok).toBe(false);
    expect(parseOverrides(JSON.stringify({ vatRate: 250 })).ok).toBe(false);
    expect(parseOverrides(null)).toEqual({ ok: true, overrides: {} });
    // Unknown keys are dropped, not stored.
    expect(parseOverrides(JSON.stringify({ evil: "x" }))).toEqual({ ok: true, overrides: {} });
  });
});

const doc: PreviewDoc = {
  kind: "quote",
  ref: "DV-2609-0001",
  title: "Migration",
  note: "",
  date: new Date("2026-09-21"),
  dueAt: "",
  currency: "DZD",
  lines: [{ label: "Audit", quantity: "2", unit: "1 000,50" }],
  client: { name: "Karim", email: "k@x.dz", company: null, phone: null },
};

describe("DocumentPreview", () => {
  it("prints the effective identity and the VAT maths", () => {
    render(<DocumentPreview doc={doc} company={effectiveCompany(base, { nif: "OVR-NIF" })} />);
    expect(screen.getByText("OVR-NIF")).toBeTruthy();
    // 2 × 1 000,50 = 2 001,00 HT ; TVA 19 % = 380,19 ; TTC 2 381,19
    expect(document.body.textContent?.replace(/\s/g, "")).toContain("2381,19DZD");
  });

  it("turns an in-place edit of a legal ID into an override callback", () => {
    const onCompany = vi.fn();
    render(<DocumentPreview doc={doc} company={base} editable onDoc={() => {}} onCompany={onCompany} />);
    const rc = screen.getByText("16/00-111");
    rc.innerText = "16/00-222";
    fireEvent.blur(rc);
    expect(onCompany).toHaveBeenCalledWith("rc", "16/00-222");
  });

  it("edits a line in place", () => {
    const onDoc = vi.fn();
    render(<DocumentPreview doc={doc} company={base} editable onDoc={onDoc} onCompany={() => {}} />);
    const label = screen.getByText("Audit");
    label.innerText = "Audit complet";
    fireEvent.blur(label);
    expect(onDoc).toHaveBeenCalledWith({ lines: [{ label: "Audit complet", quantity: "2", unit: "1 000,50" }] });
  });
});
