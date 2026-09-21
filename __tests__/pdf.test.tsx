// @vitest-environment node
import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { BillingDocument, pdfMoney, type BillingDoc } from "@/lib/pdf/BillingDocument";
import { DEFAULT_COMPANY, type CompanyIdentity } from "@/lib/settings";

/**
 * The devis / facture PDF renders, with every company field filled and with
 * none of them. Set `PDF_OUT=/some/dir` to write the files out and look at them.
 */

const doc: BillingDoc = {
  kind: "quote",
  ref: "DV-2609-0007",
  title: "Migration de l'infrastructure vers WICLOUD — phase 1",
  status: "envoye",
  lines: [
    { label: "Audit de l'existant et plan de migration", quantity: 1, unitCents: 150000_00 },
    { label: "VPS Performance (4 vCPU / 8 Go) — 12 mois", quantity: 12, unitCents: 11000_00 },
    { label: "Mise en place SMTP dédié, SPF/DKIM/DMARC", quantity: 1, unitCents: 35000_00 },
  ],
  amountCents: 317000_00,
  currency: "DZD",
  note: "Délai de mise en service : 5 jours ouvrés après acceptation.",
  issuedAt: new Date("2026-09-21"),
  dueAt: new Date("2026-10-21"),
  client: { name: "Karim Benali", email: "k.benali@exemple.dz", company: "Setycorp SARL", phone: "+213 555 12 34 56" },
};

const full: CompanyIdentity = {
  ...DEFAULT_COMPANY,
  name: "WICLOUD",
  legalForm: "SARL",
  capital: "10 000 000 DZD",
  address: "12 rue des Frères Bouadou",
  city: "Alger",
  phone: "+213 21 00 00 00",
  email: "contact@wicloud.dz",
  website: "wicloud.dz",
  rc: "16/00-1234567B21",
  nif: "002116123456789",
  nis: "0021161234567",
  ai: "16012345678",
  bank: "BNA Agence Hydra",
  rib: "001 00123 0300000123 45",
  signatoryName: "Sanaa Ardjane",
  signatoryTitle: "Gérante",
  vatRate: 19,
  footerNote: "Merci de votre confiance.",
};

async function render(name: string, d: BillingDoc, company: CompanyIdentity) {
  const bytes = await renderToBuffer(<BillingDocument doc={d} company={company} assets={{}} />);
  if (process.env.PDF_OUT) writeFileSync(join(process.env.PDF_OUT, `${name}.pdf`), bytes);
  return bytes;
}

describe("billing PDF", () => {
  it("renders a quote with the full company identity", async () => {
    const bytes = await render("devis-full", doc, full);
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(2000);
  });

  it("renders an invoice with nothing but a company name", async () => {
    const bytes = await render(
      "facture-blank",
      { ...doc, kind: "invoice", ref: "FA-2609-0003", sourceRef: "DV-2609-0007", note: null, dueAt: null },
      { ...DEFAULT_COMPANY, quoteTerms: "", invoiceTerms: "" },
    );
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("renders a long quote across pages", async () => {
    const lines = Array.from({ length: 60 }, (_, i) => ({ label: `Prestation ${i + 1}`, quantity: 1, unitCents: 1000_00 }));
    const bytes = await render("devis-long", { ...doc, lines, amountCents: 60 * 1000_00 }, full);
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("formats money with a plain space, which Helvetica can encode", () => {
    expect(pdfMoney(1_234_567_00, "DZD")).not.toMatch(/[  ]/);
  });
});
