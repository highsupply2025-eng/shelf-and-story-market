import { describe, expect, it } from "vitest";
import { royalty, isPayoutDay, canStartProduction } from "@/lib/author-rules";
describe("Author business rules", () => {
  it("gives digital authors 70%", () => expect(royalty(100,"digital",true)).toBe(70));
  it("gives physical authors 30%", () => expect(royalty(100,"physical",true)).toBe(30));
  it("excludes shipping", () => expect(royalty(100,"physical",true,50)).toBe(30));
  it("does not earn from unpaid orders", () => expect(royalty(100,"digital",false)).toBe(0));
  it("opens on day 30 only in ordinary months", () => { expect(isPayoutDay("2026-10-30")).toBe(true); expect(isPayoutDay("2026-10-29")).toBe(false); });
  it("opens on February's last day including leap years", () => { expect(isPayoutDay("2026-02-28")).toBe(true); expect(isPayoutDay("2028-02-29")).toBe(true); expect(isPayoutDay("2028-02-28")).toBe(false); });
  it("requires trusted invoice payment before production", () => { expect(canStartProduction("invoiced",true,"provider-123")).toBe(true); expect(canStartProduction("invoiced",false,null)).toBe(false); expect(canStartProduction("invoiced",true,null)).toBe(false); });
});