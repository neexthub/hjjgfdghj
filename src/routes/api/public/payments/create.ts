import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { safeExternalUrl } from "@/lib/api-contract";
import { authenticateApiKey } from "@/lib/serverfns/gateway";

/**
 * Create a payment (merchant server → gateway).
 * Auth: Authorization: Bearer npk_<api key>.
 * Body: { amount, merchantId?, orderId?, customerName?, customerPhone?,
 *         redirectUrl?, callbackUrl? }
 * redirectUrl / callbackUrl may also be passed as the x-redirect-url and
 * x-callback-url headers.
 * Returns { id, paymentUrl } — send the customer to paymentUrl.
 */
const createSchema = z.object({
  amount: z.number().positive().max(10_000_000),
  merchantId: z.string().uuid().optional(),
  orderId: z.string().max(120).optional(),
  customerName: z.string().max(120).optional(),
  customerPhone: z.string().max(20).optional(),
  customerUserId: z.string().max(120).optional(),
  storeTrx: z.string().max(120).optional(),
  metadata: z.record(z.unknown()).optional(),
  redirectUrl: safeExternalUrl.optional(),
  callbackUrl: safeExternalUrl.optional(),
});

export const Route = createFileRoute("/api/public/payments/create")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = await authenticateApiKey(request, "store");
        if (!apiKey) {
          return Response.json({ error: "Invalid or inactive API key" }, { status: 401 });
        }

        let json: unknown;
        try {
          json = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        const parsedInput = createSchema.safeParse(json);
        if (!parsedInput.success) {
          return Response.json(
            { error: "Invalid payload", issues: parsedInput.error.flatten() },
            { status: 400 },
          );
        }
        const input = parsedInput.data;
        const urls = z.object({ redirectUrl: safeExternalUrl.nullable(), callbackUrl: safeExternalUrl.nullable() }).safeParse({
          redirectUrl: input.redirectUrl ?? request.headers.get("x-redirect-url") ?? null,
          callbackUrl: input.callbackUrl ?? request.headers.get("x-callback-url") ?? null,
        });
        if (!urls.success) return Response.json({ error: "Invalid callback or redirect URL" }, { status: 400 });
        const { redirectUrl, callbackUrl } = urls.data;
        if (apiKey.merchantId && input.merchantId && apiKey.merchantId !== input.merchantId) return Response.json({ error: "Key is restricted to another merchant" }, { status: 403 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let merchantId = apiKey.merchantId ?? input.merchantId ?? null;
        if (merchantId) {
          const { data: merchant } = await supabaseAdmin
            .from("merchants")
            .select("id")
            .eq("id", merchantId)
            .eq("is_active", true)
            .maybeSingle();
          if (!merchant) {
            return Response.json({ error: "Merchant not found or inactive" }, { status: 400 });
          }
        } else {
          const { data: merchant } = await supabaseAdmin
            .from("merchants")
            .select("id")
            .eq("is_active", true)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();
          if (!merchant) {
            return Response.json({ error: "No active merchant configured" }, { status: 400 });
          }
          merchantId = merchant["id"] as string;
        }

        if (!merchantId) return Response.json({ error: "Merchant is required" }, { status: 400 });
        const { data: accounts } = await supabaseAdmin.from("merchant_accounts").select("id").eq("merchant_id", merchantId).eq("is_active", true);
        if (!accounts?.length) return Response.json({ error: "No active collection account" }, { status: 400 });
        const { data: created, error } = await supabaseAdmin
          .from("payments")
          .insert({
            merchant_id: merchantId,
            amount: input.amount,
            order_id: input.orderId?.trim() || null,
            customer_name: input.customerName?.trim() || null,
            customer_phone: input.customerPhone?.trim() || null,
            customer_user_id: input.customerUserId?.trim() || null,
            store_trx: input.storeTrx?.trim() || input.orderId?.trim() || null,
            metadata: input.metadata as never ?? {},
            redirect_url: redirectUrl?.trim() || null,
            callback_url: callbackUrl?.trim() || null,
          })
          .select("id, gateway_trx, expires_at")
          .single();
        if (error || !created) {
          return Response.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
        }

        const id = created["id"] as string;
        const origin = new URL(request.url).origin;
        return Response.json({ id, gatewayTrx: created.gateway_trx, expiresAt: created.expires_at, paymentUrl: `${origin}/pay/${id}` });
      },
    },
  },
});
