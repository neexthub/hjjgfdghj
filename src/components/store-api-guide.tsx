import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";

function Example({ title, text }: { title: string; text: string }) {
  return <div className="min-w-0 space-y-2"><div className="flex items-center justify-between"><h3 className="font-semibold">{title}</h3><Button variant="ghost" size="icon" aria-label={`Copy ${title}`} onClick={() => { void navigator.clipboard.writeText(text); toast.success("Copied"); }}><Copy /></Button></div><pre className="overflow-x-auto rounded-lg border border-border bg-muted p-4 text-xs leading-relaxed"><code>{text}</code></pre></div>;
}

export function StoreApiGuide() {
  return <section className="min-w-0 space-y-5 border-y border-border py-6">
    <h2 className="text-xl font-bold">স্টোর API নির্দেশিকা</h2>
    <p className="text-sm text-muted-foreground">স্টোর বেছে Store API কী তৈরি করুন। SMS ফোনের জন্য আলাদা SMS phone কী লাগবে। কী শুধু আপনার সার্ভারে রাখুন—ব্রাউজার, অ্যাপের প্রকাশ্য কোড বা GitHub-এ নয়। YOUR_GATEWAY-এর জায়গায় আপনার প্রকাশিত সাইটের ঠিকানা দিন।</p>
    <Example title="১. পেমেন্ট তৈরি" text={`curl -X POST 'https://YOUR_GATEWAY/api/public/payments/create' \
  -H "Authorization: Bearer $STORE_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"amount":500,"merchantId":"MERCHANT_UUID","orderId":"ORD-1001","storeTrx":"STORE-1001","customerName":"Customer","customerPhone":"01700000000","customerUserId":"USER-1","metadata":{"cartId":"CART-1"},"callbackUrl":"https://yourshop.com/api/paid","redirectUrl":"https://yourshop.com/thanks"}'

// Response: { id, paymentUrl, gatewayTrx, expiresAt }
// Customer → paymentUrl`} />
    <p className="text-sm text-muted-foreground">amount: ০-এর বেশি, সর্বোচ্চ ১০,০০০,০০০ BDT। merchantId না দিলে কী-এর স্টোর ব্যবহৃত হয়। orderId, storeTrx, customerName, customerUserId: সর্বোচ্চ ১২০ অক্ষর; customerPhone: ২০। অন্য সব ক্ষেত্র ঐচ্ছিক। URL সর্বোচ্চ ২০০০ অক্ষর; পাবলিক HTTP(S) ঠিকানা দিন। x-callback-url ও x-redirect-url হেডারও ব্যবহার করতে পারেন।</p>
    <Example title="২. পেমেন্ট উইন্ডো ও যাচাই" text={`GET /api/public/pay/PAYMENT_UUID
// { id, amount, status, orderId, redirectUrl, expiresAt, merchant, accounts }

POST /api/public/payments/verify
Content-Type: application/json
{"paymentId":"PAYMENT_UUID","trxId":"AB12CD34"}
// { status: "complete", redirectUrl } OR { status: "pending"|"invalid", message }
// Checkout uses these public endpoints; no store key in customer browser.`} />
    <Example title="৩. SMS ফোন" text={`POST /api/public/gateway/ingest
Authorization: Bearer YOUR_SMS_PHONE_KEY
Content-Type: application/json
{"deviceId":"phone-1","platform":"android","messages":[{"sender":"NAGAD","body":"You have received BDT 500.00 from 01812345678. TxnID: AB12CD34","receivedAt":"2026-10-24T12:00:00Z"}]}
// { received, parsed, stored, matched }
// SMS key must be bound to its merchant; no receiving number in the app.
// One active account per provider/type; ambiguous accounts remain unmatched.
// Optional phoneNumber is accepted for older senders.
// Up to 200 messages; sender 1–64, body 1–4000 characters.`} />
    <Example title="৪. স্টোর callback" text={`POST your callbackUrl
x-neextpay-signature: sha256=<HMAC-SHA256 of exact raw JSON body>
{
  "event":"payment.completed", "status":"complete",
  "paymentId":"UUID", "gatewayTrx":"UUID", "orderId":"ORD-1001",
  "storeTrx":"STORE-1001", "amount":500, "currency":"BDT",
  "trxId":"AB12CD34", "provider":"nagad", "receiverAccount":"01712345678",
  "accountType":"personal", "payerNumber":"01812345678",
  "customer":{"name":"Customer","phone":"01700000000","userId":"USER-1"},
  "merchant":{"id":"UUID","name":"Store"},
  "sms":{"sender":"NAGAD","body":"...","amount":500,"deviceId":"phone-1","receivedAt":"ISO timestamp"},
  "metadata":{"cartId":"CART-1"}, "createdAt":"ISO timestamp", "verifiedAt":"ISO timestamp"
}`} />
    <Example title="৫. Callback যাচাই (Node.js)" text={`import { createHmac, timingSafeEqual } from 'node:crypto';
// Read request body as raw bytes BEFORE JSON parsing.
const expected = 'sha256=' + createHmac('sha256', process.env.CALLBACK_SECRET)
  .update(rawBody).digest('hex');
const received = request.headers['x-neextpay-signature'] || '';
const a = Buffer.from(expected), b = Buffer.from(received);
if (a.length !== b.length || !timingSafeEqual(a, b)) return unauthorized();
const payment = JSON.parse(rawBody);
// Check orderId, amount, currency; process paymentId only once.
// Persist the paid order, then respond HTTP 200.`} />
    <p className="text-sm text-muted-foreground">Merchants থেকে callback secret কপি করুন। callback_status: sent, no_url, http_৪xx/৫xx বা error। স্বয়ংক্রিয় callback retry এখন নেই; ব্যর্থ হলে অর্ডার paid ধরে নেবেন না। 400 = ভুল তথ্য, 401 = ভুল/বন্ধ কী, 403 = ভুল scope/স্টোর, 404 = পেমেন্ট নেই, 409 = storeTrx আগে ব্যবহৃত হয়েছে, 500 = সার্ভার সমস্যা। পেমেন্ট list/details/cancel/delete-এর আলাদা স্টোর endpoint এখন নেই।</p>
  </section>;
}