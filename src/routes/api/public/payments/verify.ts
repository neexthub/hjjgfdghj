import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { isValidTrxIdInput } from "@/lib/match-transaction";
import { normalizeTrxId } from "@/lib/match-transaction";
import { sendPaymentCallback } from "@/lib/serverfns/gateway";

/**
 * Customer-facing TRX verification from the payment window.
 * Body: { paymentId, trxId }.
 * Strict check: the TRX ID must exist in collected SMS with the same amount
 * and the payment's merchant provider/account — then the payment completes
 * and the merchant's callback URL is called.
 */
const verifySchema = z.object({
  paymentId: z.string().uuid(),
  trxId: z.string().min(4).max(40),
});

export const Route = createFileRoute("/api/public/payments/verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let json: unknown;
        try {
          json = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        const parsedInput = verifySchema.safeParse(json);
        if (!parsedInput.success) {
          return Response.json({ error: "Invalid payload" }, { status: 400 });
        }
        const trx = normalizeTrxId(parsedInput.data.trxId);
        if (!isValidTrxIdInput(trx)) {
          return Response.json({ error: "Invalid transaction ID format" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: payment } = await supabaseAdmin
          .from("payments")
          .select(
            "id, amount, status, order_id, trx_id, callback_url, redirect_url, verified_at, provider, account_number, account_type, expires_at, deleted_at, merchants(name, provider, account_number, callback_secret)",
          )
          .eq("id", parsedInput.data.paymentId)
          .maybeSingle();
        if (!payment) {
          return Response.json({ error: "Payment not found" }, { status: 404 });
        }

        if (payment["status"] === "complete") {
          return Response.json({ status: "complete", redirectUrl: payment["redirect_url"] });
        }

        if (payment.deleted_at || payment.status !== "pending" || Date.parse(payment.expires_at) <= Date.now()) {
          return Response.json({ status: "invalid", message: "This payment is expired or no longer payable." });
        }
        const { error: saveError } = await supabaseAdmin.from("payments")
          .update({ user_verify_trx: trx }).eq("id", payment.id).eq("status", "pending");
        if (saveError) return Response.json({ error: "Verification unavailable" }, { status: 500 });

        const { data: sms } = await supabaseAdmin
          .from("sms_transactions")
          .select("id, amount, account_number, provider, account_type, is_credit, matched_payment_id")
          .eq("trx_id", trx)
          .eq("is_credit", true)
          .is("matched_payment_id", null)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!sms) {
          return Response.json({
            status: "pending",
            message:
              "We haven't received the payment SMS for this TRX ID yet. Wait a few seconds and try again.",
          });
        }

        const { data: claimed, error: claimError } = await supabaseAdmin.rpc("claim_payment_sms", { p_payment: payment["id"], p_sms: sms["id"] });
        if (claimError) return Response.json({ error: "Verification unavailable" }, { status: 500 });
        if (!claimed) return Response.json({ status: "invalid", message: "The amount, receiving account or payment status does not match this transaction." });
        const verifiedAt = new Date().toISOString();
        const callbackStatus = await sendPaymentCallback({
          id: payment["id"] as string,
          order_id: payment["order_id"] as string | null,
          amount: payment["amount"],
          callback_url: payment["callback_url"] as string | null,
          trx_id: trx,
          verified_at: verifiedAt,
          merchants: payment["merchants"],
          provider: sms["provider"],
        });
        await supabaseAdmin
          .from("payments")
          .update({ callback_status: callbackStatus, callback_sent_at: new Date().toISOString() })
          .eq("id", payment["id"] as string);

        return Response.json({ status: "complete", redirectUrl: payment["redirect_url"] });
      },
    },
  },
});
