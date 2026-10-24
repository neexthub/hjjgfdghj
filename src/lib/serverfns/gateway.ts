// Server-only helpers for the SMS gateway: API-key auth and signed callbacks.
// Plain module — safe to import from server functions and server routes.
import { createHash, createHmac } from "crypto";
import { normalizeAccountNumber } from "@/lib/match-transaction";

export type MerchantInfo = {
  name: string;
  provider: string | null;
  account_number: string | null;
  callback_secret: string | null;
};

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Accepts either a nested object or a PostgREST single-object embed. */
export function unwrapMerchant(row: unknown): MerchantInfo | null {
  const m = (row as { merchants?: unknown })?.merchants;
  const merchant = Array.isArray(m) ? m[0] : m;
  return (merchant as MerchantInfo) ?? null;
}

/** Validates a Bearer npk_… API key; returns the key id or null. */
export async function authenticateApiKey(request: Request, requiredScope: "store" | "ingest"): Promise<{ id: string; merchantId: string | null } | null> {
  const header = request.headers.get("authorization") ?? "";
  const key = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!key.startsWith("npk_") || key.length > 128) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("api_keys")
    .select("id, is_active, merchant_id, scope")
    .eq("key_hash", sha256Hex(key))
    .maybeSingle();
  if (!data || !data["is_active"] || ![requiredScope, "all"].includes(data.scope)) return null;
  await supabaseAdmin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data["id"] as string);
  return { id: data.id, merchantId: data.merchant_id };
}

export type CallbackPayment = {
  id: string;
  order_id: string | null;
  amount: number | string;
  callback_url: string | null;
  trx_id?: string | null;
  verified_at?: string | null;
  provider?: string | null;
  merchants?: MerchantInfo | MerchantInfo[] | null;
};

/**
 * POSTs the completion payload to the merchant's callback URL, signed with the
 * merchant's callback secret (HMAC-SHA256 over the raw body,
 * `x-neextpay-signature: sha256=<hex>`). Returns a status string for logging.
 */
export async function sendPaymentCallback(payment: CallbackPayment): Promise<string> {
  if (!payment.callback_url) return "no_url";
  const merchant = Array.isArray(payment.merchants)
    ? payment.merchants[0] ?? null
    : payment.merchants ?? null;
  // Load the full stored payment + matched SMS so the store gets every TRX detail.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: row }, { data: sms }] = await Promise.all([
    supabaseAdmin.from("payments").select("*").eq("id", payment.id).maybeSingle(),
    supabaseAdmin
      .from("sms_transactions")
      .select("sender, body, provider, account_type, account_number, payer_number, amount, trx_id, device_id, received_at")
      .eq("matched_payment_id", payment.id)
      .maybeSingle(),
  ]);
  const payload = buildCallbackPayload(payment, row, sms, merchant);
  const raw = JSON.stringify(payload);
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (merchant?.callback_secret) {
    headers["x-neextpay-signature"] =
      "sha256=" +
      createHmac("sha256", merchant.callback_secret).update(raw).digest("hex");
  }
  try {
    const res = await fetch(payment.callback_url, {
      redirect: "error",
      method: "POST",
      headers,
      body: raw,
      signal: AbortSignal.timeout(8000),
    });
    return res.ok ? "sent" : `http_${res.status}`;
  } catch {
    return "error";
  }
}

export { normalizeAccountNumber };

type PaymentRow = Record<string, unknown> | null;
type SmsRow = Record<string, unknown> | null;

/** Builds the merchant callback body with every known transaction detail. */
export function buildCallbackPayload(
  payment: CallbackPayment,
  row: PaymentRow,
  sms: SmsRow,
  merchant: MerchantInfo | null,
) {
  const r = row ?? {};
  const s = sms ?? null;
  const v = (k: string) => (r[k] ?? null) as string | null;
  return {
    event: "payment.completed",
    status: "complete",
    paymentId: payment.id,
    gatewayTrx: v("gateway_trx"),
    orderId: payment.order_id ?? v("order_id"),
    storeTrx: v("store_trx"),
    amount: Number(payment.amount),
    currency: "BDT",
    trxId: payment.trx_id ?? v("trx_id") ?? (s?.["trx_id"] as string | null) ?? null,
    provider: payment.provider ?? (s?.["provider"] as string | null) ?? v("provider") ?? merchant?.provider ?? null,
    receiverAccount: v("account_number") ?? (s?.["account_number"] as string | null) ?? null,
    accountType: v("account_type") ?? (s?.["account_type"] as string | null) ?? null,
    payerNumber: (s?.["payer_number"] as string | null) ?? null,
    customer: {
      name: v("customer_name"),
      phone: v("customer_phone"),
      userId: v("customer_user_id"),
    },
    merchant: { id: v("merchant_id"), name: merchant?.name ?? null },
    sms: s
      ? {
          sender: s["sender"] ?? null,
          body: s["body"] ?? null,
          amount: s["amount"] != null ? Number(s["amount"]) : null,
          deviceId: s["device_id"] ?? null,
          receivedAt: s["received_at"] ?? null,
        }
      : null,
    metadata: r["metadata"] ?? {},
    createdAt: v("created_at"),
    verifiedAt: payment.verified_at ?? v("verified_at") ?? new Date().toISOString(),
  };
}
