import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { CompanyIdentity } from "@/lib/settings";
import type { MoneyLine } from "@/lib/db/schema";

/**
 * The devis / facture PDF — one layout, two kinds.
 *
 * `@react-pdf/renderer` rather than a headless browser: it renders in the Node
 * container with no Chromium in the image, so the exact same bytes can stream
 * to a download and ride along as an e-mail attachment.
 *
 * Two constraints this file lives with:
 *  - **Colours are plain hex.** React-PDF has no CSS variables; these are the
 *    brand values from `app/globals.css`, repeated, and only the light-ground
 *    ones — paper is white.
 *  - **Text must be WinAnsi.** The built-in Helvetica cannot draw U+202F, which
 *    is what `Intl` puts between thousands in French. `pdfMoney` swaps it for a
 *    plain space; anything else passed in should already be Latin-1-safe
 *    (French is).
 *
 * Every company field is optional. A blank one is simply not printed, so the
 * first devis can go out before the paperwork is all collected.
 */

const INK = "#354666";
const ABYSS = "#26334C";
const MIST = "#EEF2F6";
const TEAL_DEEP = "#2B7D7C";
const SIGNAL = "#13C182";
const MUTED = "#5d6b85"; // ink at ~80% on paper — 5.4:1, the dashboard's second level

export type BillingDoc = {
  kind: "quote" | "invoice";
  ref: string;
  title: string;
  status: string;
  lines: MoneyLine[];
  /** The stored total (HT). Used for the totals, not a re-sum of the lines —
   *  same rule as `MoneyLines`: the stored figure is the document. */
  amountCents: number;
  currency: string;
  note: string | null;
  issuedAt: Date;
  /** Devis: valid until. Facture: due date. */
  dueAt: Date | null;
  client: { name: string; email: string; company: string | null; phone: string | null };
  /** For an invoice, the quote it came from. */
  sourceRef?: string | null;
};

export type Assets = { logo?: { data: Buffer; format: "png" | "jpg" }; signature?: { data: Buffer; format: "png" | "jpg" } };

function clean(s: string): string {
  return s.replace(/[  ]/g, " ");
}

export function pdfMoney(cents: number, currency: string): string {
  return clean(
    new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 2 }).format(cents / 100),
  );
}

function pdfDate(d: Date | null): string {
  return d ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(d) : "";
}

function pdfQty(n: number): string {
  return clean(new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n));
}

const s = StyleSheet.create({
  page: { paddingTop: 44, paddingBottom: 90, paddingHorizontal: 44, fontSize: 9.5, color: INK, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { maxWidth: 150, maxHeight: 56, objectFit: "contain" },
  brand: { fontSize: 18, lineHeight: 1.1, fontFamily: "Helvetica-Bold", color: ABYSS },
  company: { maxWidth: 230, gap: 2, color: MUTED, textAlign: "right" },
  companyName: { fontFamily: "Helvetica-Bold", color: INK, fontSize: 10.5 },
  band: { marginTop: 26, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  docType: { fontSize: 24, lineHeight: 1.1, fontFamily: "Helvetica-Bold", color: ABYSS, letterSpacing: 1 },
  docRef: { marginTop: 4, fontSize: 10.5, color: TEAL_DEEP, fontFamily: "Helvetica-Bold" },
  rule: { marginTop: 10, height: 2, backgroundColor: SIGNAL, width: 56 },
  meta: { gap: 2, textAlign: "right" },
  metaLabel: { color: MUTED },
  parties: { marginTop: 22, flexDirection: "row", gap: 16 },
  box: { flex: 1, gap: 2, backgroundColor: MIST, borderRadius: 6, padding: 12 },
  boxLabel: { fontSize: 7.5, letterSpacing: 1, color: MUTED, marginBottom: 4, fontFamily: "Helvetica-Bold" },
  boxName: { fontFamily: "Helvetica-Bold", fontSize: 10.5 },
  subject: { marginTop: 18, fontSize: 11, fontFamily: "Helvetica-Bold" },
  table: { marginTop: 12 },
  thead: { flexDirection: "row", backgroundColor: ABYSS, color: "#FFFFFF", paddingVertical: 7, paddingHorizontal: 8, borderRadius: 4, fontFamily: "Helvetica-Bold", fontSize: 8.5 },
  tr: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: "#D5DCE5" },
  cDesc: { flex: 1, paddingRight: 8 },
  cQty: { width: 50, textAlign: "right" },
  cUnit: { width: 90, textAlign: "right" },
  cTotal: { width: 95, textAlign: "right" },
  totals: { marginTop: 12, alignSelf: "flex-end", width: 235 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grand: { flexDirection: "row", justifyContent: "space-between", marginTop: 4, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: ABYSS, color: "#FFFFFF", borderRadius: 4, fontFamily: "Helvetica-Bold", fontSize: 11 },
  note: { marginTop: 20 },
  noteLabel: { fontFamily: "Helvetica-Bold", marginBottom: 3 },
  lower: { marginTop: 24, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 24 },
  terms: { flex: 1, gap: 3, color: MUTED, fontSize: 8.5 },
  signBox: { width: 190, alignItems: "center" },
  signLabel: { fontSize: 7.5, letterSpacing: 1, color: MUTED, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  signature: { maxWidth: 170, maxHeight: 70, objectFit: "contain", marginBottom: 4 },
  signLine: { width: 170, borderTopWidth: 0.75, borderTopColor: INK, marginTop: 4, paddingTop: 4, alignItems: "center" },
  pageNum: { position: "absolute", right: 44, bottom: 12, fontSize: 7, color: MUTED },
  footer: { position: "absolute", left: 44, right: 44, bottom: 24, gap: 2, borderTopWidth: 0.5, borderTopColor: "#D5DCE5", paddingTop: 8, fontSize: 7.5, color: MUTED, textAlign: "center" },
});

export function BillingDocument({
  doc,
  company,
  assets,
}: {
  doc: BillingDoc;
  company: CompanyIdentity;
  assets: Assets;
}) {
  const isQuote = doc.kind === "quote";
  const subtotal = doc.amountCents;
  const vat = company.vatRate > 0 ? Math.round((subtotal * company.vatRate) / 100) : 0;
  const total = subtotal + vat;
  const c = (v: string) => (v ? clean(v) : "");

  const addressLines = [company.address, [company.city, company.country].filter(Boolean).join(", ")].filter(Boolean);
  const contact = [company.phone, company.email, company.website].filter(Boolean).join("  ·  ");
  const legal = [
    company.legalForm && company.capital ? `${company.legalForm} au capital de ${company.capital}` : company.legalForm,
    company.rc && `RC ${company.rc}`,
    company.nif && `NIF ${company.nif}`,
    company.nis && `NIS ${company.nis}`,
    company.ai && `AI ${company.ai}`,
  ].filter(Boolean);
  const bank = [company.bank, company.rib && `RIB ${company.rib}`].filter(Boolean).join("  ·  ");
  const terms = isQuote ? company.quoteTerms : company.invoiceTerms;

  return (
    <Document
      title={`${isQuote ? "Devis" : "Facture"} ${doc.ref}`}
      author={company.name}
      subject={doc.title}
      creator={company.name}
      producer={company.name}
    >
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            {assets.logo ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt
              <Image src={assets.logo} style={s.logo} />
            ) : (
              <Text style={s.brand}>{c(company.name)}</Text>
            )}
          </View>
          <View style={s.company}>
            {/* Without a logo the name is already the wordmark on the left. */}
            {assets.logo ? <Text style={s.companyName}>{c(company.name)}</Text> : null}
            {addressLines.map((l) => (
              <Text key={l}>{c(l)}</Text>
            ))}
            {contact ? <Text>{c(contact)}</Text> : null}
          </View>
        </View>

        <View style={s.band}>
          <View>
            <Text style={s.docType}>{isQuote ? "DEVIS" : "FACTURE"}</Text>
            <Text style={s.docRef}>{doc.ref}</Text>
            <View style={s.rule} />
          </View>
          <View style={s.meta}>
            <Text>
              <Text style={s.metaLabel}>Date : </Text>
              {pdfDate(doc.issuedAt)}
            </Text>
            {doc.dueAt ? (
              <Text>
                <Text style={s.metaLabel}>{isQuote ? "Valable jusqu'au : " : "Échéance : "}</Text>
                {pdfDate(doc.dueAt)}
              </Text>
            ) : null}
            {doc.sourceRef ? (
              <Text>
                <Text style={s.metaLabel}>Devis : </Text>
                {doc.sourceRef}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={s.parties}>
          <View style={s.box}>
            <Text style={s.boxLabel}>ÉMETTEUR</Text>
            <Text style={s.boxName}>{c(company.name)}</Text>
            {addressLines.map((l) => (
              <Text key={l}>{c(l)}</Text>
            ))}
            {company.email ? <Text>{c(company.email)}</Text> : null}
          </View>
          <View style={s.box}>
            <Text style={s.boxLabel}>{isQuote ? "DESTINATAIRE" : "FACTURÉ À"}</Text>
            <Text style={s.boxName}>{c(doc.client.company || doc.client.name)}</Text>
            {doc.client.company ? <Text>{c(doc.client.name)}</Text> : null}
            <Text>{c(doc.client.email)}</Text>
            {doc.client.phone ? <Text>{c(doc.client.phone)}</Text> : null}
          </View>
        </View>

        <Text style={s.subject}>Objet : {c(doc.title)}</Text>

        <View style={s.table}>
          <View style={s.thead} fixed>
            <Text style={s.cDesc}>Désignation</Text>
            <Text style={s.cQty}>Qté</Text>
            <Text style={s.cUnit}>P.U. HT</Text>
            <Text style={s.cTotal}>Total HT</Text>
          </View>
          {doc.lines.map((l, i) => (
            <View key={i} style={s.tr} wrap={false}>
              <Text style={s.cDesc}>{c(l.label)}</Text>
              <Text style={s.cQty}>{pdfQty(l.quantity)}</Text>
              <Text style={s.cUnit}>{pdfMoney(l.unitCents, doc.currency)}</Text>
              <Text style={s.cTotal}>{pdfMoney(Math.round(l.quantity * l.unitCents), doc.currency)}</Text>
            </View>
          ))}
        </View>

        <View style={s.totals} wrap={false}>
          {vat > 0 ? (
            <>
              <View style={s.totalRow}>
                <Text>Total HT</Text>
                <Text>{pdfMoney(subtotal, doc.currency)}</Text>
              </View>
              <View style={s.totalRow}>
                <Text>TVA {pdfQty(company.vatRate)} %</Text>
                <Text>{pdfMoney(vat, doc.currency)}</Text>
              </View>
            </>
          ) : null}
          <View style={s.grand}>
            <Text>{vat > 0 ? "Total TTC" : "Total"}</Text>
            <Text>{pdfMoney(total, doc.currency)}</Text>
          </View>
        </View>

        {doc.note ? (
          <View style={s.note} wrap={false}>
            <Text style={s.noteLabel}>Remarques</Text>
            <Text>{c(doc.note)}</Text>
          </View>
        ) : null}

        <View style={s.lower} wrap={false}>
          <View style={s.terms}>
            {terms ? <Text>{c(terms)}</Text> : null}
            {!isQuote && bank ? <Text style={{ marginTop: 6 }}>Règlement : {c(bank)}</Text> : null}
            {isQuote ? (
              <Text style={{ marginTop: 10 }}>Bon pour accord — date et signature du client :</Text>
            ) : null}
          </View>
          <View style={s.signBox}>
            <Text style={s.signLabel}>POUR {c(company.name).toUpperCase()}</Text>
            {assets.signature ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt
              <Image src={assets.signature} style={s.signature} />
            ) : (
              <View style={{ height: 50 }} />
            )}
            <View style={s.signLine}>
              {company.signatoryName ? <Text style={{ fontFamily: "Helvetica-Bold" }}>{c(company.signatoryName)}</Text> : null}
              {company.signatoryTitle ? <Text style={{ color: MUTED }}>{c(company.signatoryTitle)}</Text> : null}
            </View>
          </View>
        </View>

        <View style={s.footer} fixed>
          {legal.length ? <Text>{c(legal.join("  ·  "))}</Text> : null}
          {bank ? <Text>{c(bank)}</Text> : null}
          {company.footerNote ? <Text>{c(company.footerNote)}</Text> : null}
        </View>
        {/* Its own fixed element: a render-prop Text nested in the fixed footer
            makes react-pdf drop the footer from every page. */}
        <Text
          style={s.pageNum}
          fixed
          render={({ pageNumber, totalPages }) => `${doc.ref} — ${pageNumber} / ${totalPages}`}
        />
      </Page>
    </Document>
  );
}
