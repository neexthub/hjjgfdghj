import { describe, expect, it } from "vitest";
import { ingestSchema, resolveSmsAccount } from "@/lib/sms-account";
const accounts = [{ merchant_id: "store-a", provider: "bkash", account_type: "personal", account_number: "01712345678" }];
describe("number-free SMS connection", () => {
  it("accepts only URL-key transport payload without phoneNumber", () => {
    expect(ingestSchema.safeParse({ deviceId: "phone-1", messages: [{ sender: "bKash", body: "Received Tk 500. TrxID ABC123456" }] }).success).toBe(true);
  });
  it("resolves the key's store collection account", () => { expect(resolveSmsAccount(accounts, "store-a", "bkash", "personal", null)?.account_number).toBe("01712345678"); });
  it("cannot resolve another store", () => { expect(resolveSmsAccount(accounts, "store-b", "bkash", "personal", null)).toBeNull(); });
  it("does not guess with an unbound key", () => { expect(resolveSmsAccount(accounts, null, "bkash", "personal", null)).toBeNull(); });
  it("does not guess between two receiving wallets", () => { expect(resolveSmsAccount([...accounts, { ...accounts[0], account_number: "01812345678" }], "store-a", "bkash", "personal", null)).toBeNull(); });
  it("separates merchant from personal messages", () => { expect(resolveSmsAccount(accounts, "store-a", "bkash", "merchant", null)).toBeNull(); });
});