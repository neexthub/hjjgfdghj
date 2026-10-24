import { describe, expect, it } from "vitest";
import { safeExternalUrl } from "@/lib/api-contract";
import { buildCallbackPayload } from "@/lib/serverfns/gateway";

describe("store integration", () => {
  it("rejects non-HTTP callbacks and private literal destinations", () => {
    for (const url of ["file:///etc/passwd", "http://127.0.0.1/", "http://localhost/", "https://user:pass@example.com/", "http://[::1]/"]) expect(safeExternalUrl.safeParse(url).success).toBe(false);
    expect(safeExternalUrl.safeParse("https://shop.example.com/paid").success).toBe(true);
  });
  it("includes all known TRX, customer, store and SMS details in callback", () => {
    const payload = buildCallbackPayload({ id: "payment-1", order_id: "ORD-1", amount: 500, callback_url: null },
      { gateway_trx: "gateway-1", store_trx: "store-1", customer_name: "Buyer", customer_phone: "01912345678", customer_user_id: "user-1", merchant_id: "merchant-1", account_number: "01712345678", metadata: { cart: "cart-1" } },
      { trx_id: "AB12CD34", payer_number: "01812345678", sender: "NAGAD", body: "SMS body", amount: 500, provider: "nagad", account_type: "personal", device_id: "phone-1", received_at: "2026-10-24T12:00:00Z" },
      { name: "Store", provider: "nagad", account_number: "01712345678", callback_secret: null });
    expect(payload).toMatchObject({ paymentId: "payment-1", gatewayTrx: "gateway-1", storeTrx: "store-1", amount: 500, currency: "BDT", trxId: "AB12CD34", receiverAccount: "01712345678", payerNumber: "01812345678", customer: { name: "Buyer", phone: "01912345678", userId: "user-1" }, merchant: { id: "merchant-1", name: "Store" }, sms: { sender: "NAGAD", body: "SMS body", amount: 500, deviceId: "phone-1", receivedAt: "2026-10-24T12:00:00Z" }, metadata: { cart: "cart-1" } });
  });
});