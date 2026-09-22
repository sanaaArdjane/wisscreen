import { describe, expect, it } from "vitest";
import {
  PASSWORD_RULES,
  generatePassword,
  isStrongPassword,
  passwordProblem,
} from "@/lib/password";

describe("password rules", () => {
  it("rejects what the checklist says it rejects", () => {
    expect(isStrongPassword("short1A!")).toBe(false); // 8 chars
    expect(isStrongPassword("alllowercase1!")).toBe(false); // no upper
    expect(isStrongPassword("ALLUPPERCASE1!")).toBe(false); // no lower
    expect(isStrongPassword("NoDigitsHere!!")).toBe(false); // no digit
    expect(isStrongPassword("NoSymbolHere12")).toBe(false); // no symbol
    expect(isStrongPassword("Correct-Horse9")).toBe(true);
  });

  it("names every unmet rule, and says nothing when there are none", () => {
    expect(passwordProblem("Correct-Horse9")).toBeNull();
    const problem = passwordProblem("abc");
    expect(problem).toContain("une lettre majuscule");
    expect(problem).toContain("un chiffre");
    expect(problem).not.toContain("une lettre minuscule");
  });

  it("generates passwords that satisfy every rule, by construction", () => {
    // Not a spot check: the generator seeds one character per class and shuffles, so a
    // failure here would be a real break rather than an unlucky draw.
    for (let i = 0; i < 500; i++) {
      const pw = generatePassword();
      expect(pw).toHaveLength(18);
      for (const rule of PASSWORD_RULES) {
        expect(rule.test(pw), `${rule.id} failed for ${pw}`).toBe(true);
      }
    }
  });

  it("honours a requested length and still covers every class at the minimum", () => {
    expect(generatePassword(10)).toHaveLength(10);
    expect(isStrongPassword(generatePassword(10))).toBe(true);
  });
});
