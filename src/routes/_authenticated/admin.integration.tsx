import { Button } from "@/components/ui/button";
import { brandHead } from "@/lib/brand";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { listMerchants, saveMerchantIntegration, sendTestCallback } from "@/lib/serverfns/admin";
import { PageHeader, Panel, fieldClass } from "@/components/admin-ui";

export const Route = createFileRoute("/_authenticated/admin/integration")({
  head: () => brandHead("Gateway integration", "Connect your store to Neext Pay: create payments, verify callbacks and redirect customers."),
  component: Integration,
});

function copy(text: string, what = "Copied") {
  void navigator.clipboard.writeText(text);
  toast.success(what);
}

function CopyRow({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [show, setShow] = useState(!secret);
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 break-all rounded-md border border-border bg-muted px-3 py-2 font-mono text-xs">{value ? (show ? value : "•".repeat(24)) : "— not set —"}</code>
        {secret && value && <Button size="sm" variant="ghost" onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</Button>}
        {value && <Button size="icon" variant="outline" aria-label={`Copy ${label}`} onClick={() => copy(value, `${label} copied`)}><Copy /></Button>}
      </div>
    </div>
  );
}

function Code({ title, text }: { title: string; text: string }) {
  return (
    <div className="min-w-0 space-y-2">
      <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">{title}</h3><Button variant="ghost" size="icon" aria-label={`Copy ${title}`} onClick={() => copy(text)}><Copy /></Button></div>
      <pre className="overflow-x-auto rounded-lg border border-border bg-muted p-4 text-xs leading-relaxed"><code>{text}</code></pre>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 p-5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{n}</span>
      <div className="min-w-0 flex-1 space-y-3"><h3 className="font-bold">{title}</h3>{children}</div>
    </div>
  );
}

function Integration() {
  const list = useServerFn(listMerchants);
  const save = useServerFn(saveMerchantIntegration);
  const test = useServerFn(sendTestCallback);
  const qc = useQueryClient();
  const { data: merchants } = useQuery<any[]>({ queryKey: ["merchants"], queryFn: () => list() });
  const [origin, setOrigin] = useState("https://YOUR_GATEWAY");
  const [id, setId] = useState("");
  const [cb, setCb] = useState("");
  const [ok, setOk] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const m = merchants?.find((x) => x.id === id) ?? merchants?.[0];
  useEffect(() => { if (m) { setId(m.id); setCb(m.callback_url ?? ""); setOk(m.success_url ?? ""); } }, [m?.id, m?.callback_url, m?.success_url]);
  const refresh = () => qc.invalidateQueries({ queryKey: ["merchants"] });

  async function run(p: Parameters<typeof save>[0]["data"], msg: string) {
    try { await save({ data: p }); toast.success(msg); refresh(); } catch (x) { toast.error((x as Error).message); }
  }

  const createUrl = `${origin}/api/public/payments/create`;
  const mid = m?.id ?? "MERCHANT_ID";
  const cbUrl = cb || "https://yourshop.com/api/neextpay/callback";
  const okUrl = ok || "https://yourshop.com/order/success";

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Integrations" title="Gateway integration" description="Connect a store website: create payment → customer pays → gateway verifies → callback updates your store → customer returns to your site." />

      <Panel title="1. Choose the store">
        <div className="space-y-4 p-5">
          {!merchants?.length ? (
            <p className="text-sm text-muted-foreground">No merchants yet. <Link to="/admin/merchants" className="font-semibold text-primary">Add a merchant</Link> first.</p>
          ) : (
            <select aria-label="Merchant" className={fieldClass} value={id} onChange={(e) => setId(e.target.value)}>
              {merchants.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          )}
          {m && (
            <div className="grid gap-4 md:grid-cols-2">
              <CopyRow label="API URL (create payment)" value={createUrl} />
              <CopyRow label="Merchant ID" value={m.id} />
            </div>
          )}
          <p className="text-sm text-muted-foreground">Store API key: create one on <Link to="/admin/api-keys" className="font-semibold text-primary">API & phones</Link> with type “Store API” for this merchant, then press Copy.</p>
        </div>
      </Panel>

      {m && (
        <Panel title="2. Callback & redirect settings">
          <div className="space-y-5 p-5">
            <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={(e) => { e.preventDefault(); void run({ id: m.id, callbackUrl: cb, successUrl: ok }, "Settings saved"); }}>
              <label className="space-y-1 text-sm"><span className="font-medium">Callback URL (your server)</span><input value={cb} onChange={(e) => setCb(e.target.value)} placeholder="https://yourshop.com/api/neextpay/callback" className={`${fieldClass} w-full`} /></label>
              <label className="space-y-1 text-sm"><span className="font-medium">Redirect URL after success</span><input value={ok} onChange={(e) => setOk(e.target.value)} placeholder="https://yourshop.com/order/success" className={`${fieldClass} w-full`} /></label>
              <Button className="h-10 self-end">Save</Button>
            </form>
            <p className="text-xs text-muted-foreground">These are defaults. A payment request can override them with its own callbackUrl / redirectUrl.</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <CopyRow label="Callback key (header x-callback-key)" value={m.callback_api_key ?? ""} secret />
                <Button size="sm" variant="outline" onClick={() => { if (!m.callback_api_key || confirm("Generate a new callback key? The old one stops matching.")) void run({ id: m.id, regenerate: "callback_key" }, "Callback key generated"); }}><RefreshCw /> {m.callback_api_key ? "Regenerate" : "Generate"} key</Button>
              </div>
              <div className="space-y-2">
                <CopyRow label="Signing secret (x-neextpay-signature)" value={m.callback_secret ?? ""} secret />
                <Button size="sm" variant="outline" onClick={() => { if (confirm("Generate a new signing secret?")) void run({ id: m.id, regenerate: "callback_secret" }, "Signing secret generated"); }}><RefreshCw /> Regenerate secret</Button>
              </div>
            </div>
            <Button variant="secondary" onClick={async () => {
              try { const r = await test({ data: { id: m.id } }); r.ok ? toast.success(`Your server replied ${r.status} — callback works`) : toast.error(r.status ? `Your server replied ${r.status}` : `Could not reach callback URL${"error" in r && r.error ? `: ${r.error}` : ""}`); }
              catch (x) { toast.error((x as Error).message); }
            }}><Send /> Send test callback</Button>
          </div>
        </Panel>
      )}

      <Panel title="3. Step-by-step setup">
        <div className="divide-y divide-border">
          <Step n={1} title="Save your credentials on your store server">
            <p className="text-sm text-muted-foreground">Keep these only on your server (never in browser JavaScript or GitHub).</p>
            <Code title=".env on your store" text={`NEEXTPAY_API_URL=${createUrl}
NEEXTPAY_API_KEY=npk_...            # Store API key (API & phones → Copy)
NEEXTPAY_MERCHANT_ID=${mid}
NEEXTPAY_CALLBACK_KEY=${m?.callback_api_key ? "ncb_..." : "generate above"}   # Callback key
NEEXTPAY_CALLBACK_SECRET=...        # Signing secret`} />
          </Step>
          <Step n={2} title="Create a payment when the customer clicks Pay">
            <Code title="cURL" text={`curl -X POST '${createUrl}' \\
  -H "Authorization: Bearer $NEEXTPAY_API_KEY" \\
  -H 'Content-Type: application/json' \\
  -d '{
    "amount": 500,
    "merchantId": "${mid}",
    "orderId": "ORD-1001",
    "storeTrx": "STORE-1001",
    "customerName": "Rahim",
    "customerPhone": "01700000000",
    "customerUserId": "USER-1",
    "metadata": { "cartId": "CART-1" },
    "callbackUrl": "${cbUrl}",
    "redirectUrl": "${okUrl}"
  }'`} />
            <Code title="Node.js (store server)" text={`const res = await fetch(process.env.NEEXTPAY_API_URL, {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.NEEXTPAY_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    amount: order.total,
    merchantId: process.env.NEEXTPAY_MERCHANT_ID,
    orderId: order.id,
    storeTrx: order.id,          // must be unique per order
    customerName: order.name,
    customerPhone: order.phone,
  }),
});
const data = await res.json();
if (!res.ok) throw new Error(data.error);
// data = { id, gatewayTrx, expiresAt, paymentUrl }
await db.orders.update(order.id, { gatewayPaymentId: data.id });
return redirect(data.paymentUrl);   // open the payment window`} />
          </Step>
          <Step n={3} title="Customer pays in the payment window">
            <p className="text-sm text-muted-foreground">The customer picks bKash, Nagad, Rocket or Upay, sends money to the shown number and enters the TrxID. The gateway checks it against the SMS forwarded by your Android phone and marks the payment complete.</p>
          </Step>
          <Step n={4} title="Gateway calls your callback URL">
            <Code title="Request your server receives" text={`POST ${cbUrl}
Content-Type: application/json
x-callback-key: ncb_...                       # equals NEEXTPAY_CALLBACK_KEY
x-neextpay-signature: sha256=<HMAC-SHA256 of raw body with signing secret>

{
  "event": "payment.completed", "status": "complete",
  "paymentId": "UUID", "gatewayTrx": "UUID",
  "orderId": "ORD-1001", "storeTrx": "STORE-1001",
  "amount": 500, "currency": "BDT",
  "trxId": "AB12CD34", "provider": "nagad", "accountType": "personal",
  "receiverAccount": "01712345678", "payerNumber": "01812345678",
  "customer": { "name": "Rahim", "phone": "01700000000", "userId": "USER-1" },
  "merchant": { "id": "${mid}", "name": "${m?.name ?? "Store"}" },
  "metadata": { "cartId": "CART-1" },
  "createdAt": "ISO", "verifiedAt": "ISO"
}`} />
          </Step>
          <Step n={5} title="Verify the callback and update your order">
            <Code title="Node.js / Express" text={`import express from "express";
import { createHmac, timingSafeEqual } from "node:crypto";

app.post("/api/neextpay/callback", express.raw({ type: "application/json" }), async (req, res) => {
  const raw = req.body; // Buffer — read BEFORE JSON.parse
  // 1) callback key
  if (req.get("x-callback-key") !== process.env.NEEXTPAY_CALLBACK_KEY) return res.sendStatus(401);
  // 2) signature
  const expected = Buffer.from("sha256=" + createHmac("sha256", process.env.NEEXTPAY_CALLBACK_SECRET).update(raw).digest("hex"));
  const got = Buffer.from(req.get("x-neextpay-signature") || "");
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return res.sendStatus(401);

  const p = JSON.parse(raw.toString());
  if (p.event === "payment.test") return res.sendStatus(200);
  const order = await db.orders.find(p.orderId);
  if (!order || Number(order.total) !== p.amount) return res.sendStatus(400);
  if (order.status !== "paid") {
    await db.orders.update(order.id, { status: "paid", trxId: p.trxId, provider: p.provider });
  }
  res.sendStatus(200); // reply 200 so the gateway records "sent"
});`} />
            <Code title="PHP" text={`<?php
$raw = file_get_contents('php://input');
if (($_SERVER['HTTP_X_CALLBACK_KEY'] ?? '') !== getenv('NEEXTPAY_CALLBACK_KEY')) { http_response_code(401); exit; }
$expected = 'sha256=' . hash_hmac('sha256', $raw, getenv('NEEXTPAY_CALLBACK_SECRET'));
if (!hash_equals($expected, $_SERVER['HTTP_X_NEEXTPAY_SIGNATURE'] ?? '')) { http_response_code(401); exit; }
$p = json_decode($raw, true);
// find order $p['orderId'], check $p['amount'], mark paid once
http_response_code(200);`} />
          </Step>
          <Step n={6} title="Customer sees success and returns to your store">
            <p className="text-sm text-muted-foreground">After verification the payment window shows a success screen. Tapping <strong>Finish</strong> sends the customer to the redirect URL (<code className="font-mono">{okUrl}</code>). If no redirect URL is set, the customer stays on the success screen. On that page, show the order status from your own database (updated by the callback) — don't trust the redirect alone.</p>
          </Step>
        </div>
      </Panel>

      <Panel title="Reference">
        <div className="space-y-2 p-5 text-sm text-muted-foreground">
          <p><strong className="text-foreground">Fields:</strong> amount (required, &gt; 0, max 10,000,000 BDT). orderId, storeTrx, customerName, customerUserId up to 120 characters; customerPhone up to 20. URLs must be public https addresses.</p>
          <p><strong className="text-foreground">Errors:</strong> 400 invalid data · 401 wrong/disabled API key · 403 key belongs to another merchant · 409 storeTrx already used · 500 server problem.</p>
          <p><strong className="text-foreground">Callback status</strong> (shown in Transactions): sent · http_4xx/5xx · error · no_url. Callbacks are not retried automatically — check Transactions if your order did not update.</p>
          <p>Payments expire after 1 hour if not paid.</p>
        </div>
      </Panel>
    </div>
  );
}
