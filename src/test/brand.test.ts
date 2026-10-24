import { describe, expect, it } from "vitest";
import { PAYMENT_INTRO_MS, shouldShowIntro } from "@/lib/brand";
describe("Brand intro", () => {
  it("lasts 1.8 seconds", () => expect(PAYMENT_INTRO_MS).toBe(1800));
  it("shows on admin and payment pages", () => {
    expect(shouldShowIntro("/admin")).toBe(true);
    expect(shouldShowIntro("/admin/merchants")).toBe(true);
    expect(shouldShowIntro("/pay/abc")).toBe(true);
  });
  it("does not show on home or login", () => {
    expect(shouldShowIntro("/")).toBe(false);
    expect(shouldShowIntro("/auth")).toBe(false);
  });
});
