import { describe, expect, it } from "vitest";

import {
  ALL_PERMISSIONS,
  can,
  effectivePermissions,
  isRoleDefault,
  isStaff,
  type PermissionKey,
} from "@/lib/permissions";
import {
  canTransition,
  isClosed,
  isRequestStatus,
  nextStatuses,
  REQUEST_STATUSES,
} from "@/lib/requests";
import { buildRef, nextRef, refPeriod, refSequence } from "@/lib/ref";
import { formatMoney, lineTotalCents, parseMoneyToCents, totalCents } from "@/lib/money";
import { describe as describeQuota, nextPeriodReset } from "@/lib/quotas";
import { effectiveInvoiceStatus, isQuoteExpired } from "@/lib/billing";

/**
 * The dashboard's pure logic. Every one of these is a rule the UI *and* a server
 * action both depend on, so a regression here is a silent authorization or
 * billing bug rather than a visible layout break.
 *
 * No database: these are the functions worth pinning precisely because they are
 * decisions, not queries.
 */

describe("can()", () => {
  const admin = { role: "admin" };
  const staff = { role: "staff" };
  const client = { role: "user" };

  it("gives an admin everything", () => {
    for (const key of ALL_PERMISSIONS) expect(can(admin, key)).toBe(true);
  });

  it("gives a plain client nothing in the admin surface", () => {
    for (const key of ALL_PERMISSIONS) expect(can(client, key)).toBe(false);
  });

  it("gives staff the operational defaults but not roles, settings or deletion", () => {
    expect(can(staff, "requests:write")).toBe(true);
    expect(can(staff, "invoices:write")).toBe(true);
    expect(can(staff, "team:write")).toBe(false);
    expect(can(staff, "settings:write")).toBe(false);
    expect(can(staff, "users:delete")).toBe(false);
  });

  it("grants a single key above the role's defaults", () => {
    expect(can({ role: "staff", permissions: { "settings:write": true } }, "settings:write")).toBe(
      true,
    );
  });

  it("revokes a single key below the role's defaults — including for an admin", () => {
    expect(
      can({ role: "staff", permissions: { "invoices:write": false } }, "invoices:write"),
    ).toBe(false);
    expect(can({ role: "admin", permissions: { "users:delete": false } }, "users:delete")).toBe(
      false,
    );
  });

  it("refuses everything to a suspended account, whatever its role or grants", () => {
    expect(can({ role: "admin", banned: true }, "requests:read")).toBe(false);
    expect(
      can({ role: "user", banned: true, permissions: { "users:read": true } }, "users:read"),
    ).toBe(false);
  });

  it("treats an unknown or missing role as a plain client", () => {
    expect(can({ role: "wizard" }, "requests:read")).toBe(false);
    expect(can({}, "requests:read")).toBe(false);
    expect(can(null, "requests:read")).toBe(false);
  });

  it("ignores an override for a key that is not a real permission", () => {
    const principal = { role: "user", permissions: { "nonsense:write": true } };
    expect(can(principal, "requests:read")).toBe(false);
    expect(isStaff(principal)).toBe(false);
  });
});

describe("isStaff()", () => {
  it("is true for admin and staff", () => {
    expect(isStaff({ role: "admin" })).toBe(true);
    expect(isStaff({ role: "staff" })).toBe(true);
  });

  it("is false for a plain client", () => {
    expect(isStaff({ role: "user" })).toBe(false);
  });

  it("opens the door for a client granted any single admin capability", () => {
    expect(isStaff({ role: "user", permissions: { "leads:read": true } })).toBe(true);
  });

  it("stays shut for a suspended account", () => {
    expect(isStaff({ role: "admin", banned: true })).toBe(false);
  });
});

describe("effectivePermissions() / isRoleDefault()", () => {
  it("returns an entry for every permission", () => {
    const all = effectivePermissions({ role: "staff" });
    expect(Object.keys(all)).toHaveLength(ALL_PERMISSIONS.length);
  });

  it("agrees with can() key by key", () => {
    const principal = { role: "staff", permissions: { "settings:write": true } };
    const all = effectivePermissions(principal);
    for (const key of ALL_PERMISSIONS) expect(all[key]).toBe(can(principal, key));
  });

  it("reports whether a value deviates from the role, which is what gets stored", () => {
    expect(isRoleDefault("staff", "requests:write")).toBe(true);
    expect(isRoleDefault("staff", "settings:write")).toBe(false);
    expect(isRoleDefault("admin", "users:delete" as PermissionKey)).toBe(true);
  });
});

describe("request status transitions", () => {
  it("never allows a transition out of a closed state", () => {
    expect(nextStatuses("refusee")).toEqual([]);
    expect(nextStatuses("terminee")).toEqual([]);
    expect(canTransition("refusee", "en_cours")).toBe(false);
    expect(canTransition("terminee", "nouvelle")).toBe(false);
  });

  it("allows the normal path forward", () => {
    expect(canTransition("nouvelle", "en_cours")).toBe(true);
    expect(canTransition("en_cours", "acceptee")).toBe(true);
    expect(canTransition("acceptee", "terminee")).toBe(true);
  });

  it("refuses a jump straight from new to done", () => {
    expect(canTransition("nouvelle", "terminee")).toBe(false);
  });

  it("refuses a no-op and an unknown status", () => {
    expect(canTransition("en_cours", "en_cours")).toBe(false);
    expect(canTransition("en_cours", "archivee")).toBe(false);
    expect(canTransition("inventee", "terminee")).toBe(false);
  });

  it("only ever offers real statuses", () => {
    for (const from of REQUEST_STATUSES) {
      for (const to of nextStatuses(from)) expect(isRequestStatus(to)).toBe(true);
    }
  });

  it("knows which states are closed", () => {
    expect(isClosed("terminee")).toBe(true);
    expect(isClosed("refusee")).toBe(true);
    expect(isClosed("en_cours")).toBe(false);
  });
});

describe("reference codes", () => {
  const march = new Date(Date.UTC(2026, 2, 15));

  it("formats as PREFIX-YYMM-NNNN", () => {
    expect(buildRef("WC", 42, march)).toBe("WC-2603-0042");
    expect(refPeriod(march)).toBe("2603");
  });

  it("continues from the highest sequence in the same month", () => {
    expect(nextRef("WC", ["WC-2603-0001", "WC-2603-0007", "WC-2603-0003"], march)).toBe(
      "WC-2603-0008",
    );
  });

  it("starts at 1 when the month is empty", () => {
    expect(nextRef("WC", [], march)).toBe("WC-2603-0001");
  });

  it("ignores other months and other prefixes", () => {
    expect(
      nextRef("WC", ["WC-2602-0099", "DV-2603-0050", "FA-2603-0100"], march),
    ).toBe("WC-2603-0001");
  });

  it("keeps counters independent per prefix", () => {
    const existing = ["WC-2603-0005", "DV-2603-0002"];
    expect(nextRef("WC", existing, march)).toBe("WC-2603-0006");
    expect(nextRef("DV", existing, march)).toBe("DV-2603-0003");
  });

  it("reads back the sequence, and 0 for anything that is not one of ours", () => {
    expect(refSequence("FA-2603-0123")).toBe(123);
    expect(refSequence("nope")).toBe(0);
    expect(refSequence("WC-2603-12345")).toBe(0);
  });
});

describe("money", () => {
  const lines = [
    { label: "Intégration", quantity: 2, unitCents: 150_000 },
    { label: "Formation", quantity: 1, unitCents: 75_050 },
  ];

  it("multiplies a line and sums the document", () => {
    expect(lineTotalCents(lines[0])).toBe(300_000);
    expect(totalCents(lines)).toBe(375_050);
  });

  it("sums an empty document to zero rather than NaN", () => {
    expect(totalCents([])).toBe(0);
  });

  it("rounds a fractional quantity to whole cents", () => {
    expect(lineTotalCents({ label: "Jours", quantity: 0.5, unitCents: 33_333 })).toBe(16_667);
  });

  it("parses what a French keyboard produces", () => {
    expect(parseMoneyToCents("1 250,50")).toBe(125_050);
    expect(parseMoneyToCents("1250.5")).toBe(125_050);
    expect(parseMoneyToCents("0")).toBe(0);
  });

  it("rejects anything that is not a price", () => {
    expect(parseMoneyToCents("")).toBeNull();
    expect(parseMoneyToCents("abc")).toBeNull();
    expect(parseMoneyToCents("12,345")).toBeNull();
  });

  it("formats without ever losing the currency", () => {
    expect(formatMoney(125_050, "DZD")).toContain("1");
    expect(formatMoney(0, "DZD")).toBeTruthy();
  });
});

describe("quotas", () => {
  it("treats a null limit as unlimited and a zero limit as not included", () => {
    const unlimited = describeQuota({
      metric: "demo.runs",
      limit: null,
      used: 900,
      resetsAt: null,
    });
    expect(unlimited.unlimited).toBe(true);
    expect(unlimited.included).toBe(true);
    expect(unlimited.remaining).toBeNull();

    const excluded = describeQuota({
      metric: "demo.runs",
      limit: 0,
      used: 0,
      resetsAt: null,
    });
    expect(excluded.included).toBe(false);
    expect(excluded.ratio).toBe(0);
  });

  it("computes what is left, and never reports a negative remainder", () => {
    expect(
      describeQuota({ metric: "requests.monthly", limit: 5, used: 2, resetsAt: null }).remaining,
    ).toBe(3);
    expect(
      describeQuota({ metric: "requests.monthly", limit: 5, used: 9, resetsAt: null }).remaining,
    ).toBe(0);
  });

  it("caps the progress ratio at 1 even when a limit was lowered under current usage", () => {
    const over = describeQuota({
      metric: "requests.monthly",
      limit: 5,
      used: 50,
      resetsAt: null,
    });
    expect(over.ratio).toBe(1);
  });

  it("rolls the period over to the first of the next month, in UTC", () => {
    const reset = nextPeriodReset(new Date(Date.UTC(2026, 11, 20)));
    expect(reset.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});

describe("billing status", () => {
  const past = new Date(Date.now() - 86_400_000);
  const future = new Date(Date.now() + 86_400_000);

  it("derives 'en retard' from the due date rather than a stored flag", () => {
    expect(effectiveInvoiceStatus({ status: "envoyee", dueAt: past })).toBe("en_retard");
    expect(effectiveInvoiceStatus({ status: "envoyee", dueAt: future })).toBe("envoyee");
    expect(effectiveInvoiceStatus({ status: "envoyee", dueAt: null })).toBe("envoyee");
  });

  it("never marks a paid or draft invoice late", () => {
    expect(effectiveInvoiceStatus({ status: "payee", dueAt: past })).toBe("payee");
    expect(effectiveInvoiceStatus({ status: "brouillon", dueAt: past })).toBe("brouillon");
  });

  it("expires only a sent quote whose validity has passed", () => {
    expect(isQuoteExpired({ status: "envoye", validUntil: past })).toBe(true);
    expect(isQuoteExpired({ status: "envoye", validUntil: future })).toBe(false);
    expect(isQuoteExpired({ status: "envoye", validUntil: null })).toBe(false);
    expect(isQuoteExpired({ status: "accepte", validUntil: past })).toBe(false);
  });
});
