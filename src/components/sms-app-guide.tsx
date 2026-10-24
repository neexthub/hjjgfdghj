import { Button } from "@/components/ui/button";
import { Panel } from "@/components/admin-ui";
import { CheckCircle2, Copy, Download, KeyRound, Link2, ListChecks, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function CopyRow({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <code className={`min-w-0 flex-1 break-all rounded bg-card px-3 py-2 text-sm ${mono ? "font-mono" : ""}`}>{value}</code>
        <Button
          variant="outline"
          size="icon"
          aria-label={`Copy ${label}`}
          onClick={() => {
            void navigator.clipboard.writeText(value);
            toast.success("Copied");
          }}
        >
          <Copy />
        </Button>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{n}</span>
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{children}</p>
      </div>
    </li>
  );
}

/**
 * Full SMS-gateway integration guide for the admin "API & phones" page.
 * Shows the real ingest URL for this site, the app download link, and
 * step-by-step setup so a merchant can connect an Android phone without docs.
 */
export function SmsAppGuide() {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const ingestUrl = origin ? `${origin}/api/public/gateway/ingest` : "…";

  return (
    <Panel title="SMS অ্যাপ সংযোগ — পূর্ণ গাইড">
      <div className="space-y-6 p-5">
        <p className="text-sm text-muted-foreground">
          আপনার Android ফোনটি bKash, Nagad, Upay ও Rocket-এর পেমেন্ট SMS পড়ে সরাসরি এই সার্ভারে পাঠায়।
          সার্ভার TRX যাচাই করে পেমেন্ট complete করে এবং আপনার স্টোরে callback পাঠায়। ফোনে কোনো ওয়ালেট নম্বর দেওয়ার দরকার নেই—শুধু API URL আর SMS phone key।
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <CopyRow label="API URL (অ্যাপে দেবেন)" value={ingestUrl} />
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Android অ্যাপ</p>
            <div className="mt-1.5 flex items-center gap-2">
              <Smartphone className="h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Neext Pay SMS Gateway</p>
                <p className="text-xs text-muted-foreground">স্বাক্ষরিত release APK · Android 6.0+</p>
              </div>
              <Button asChild size="sm">
                <a href="/downloads/neext-pay-release.apk" download>
                  <Download /> ডাউনলোড
                </a>
              </Button>
            </div>
          </div>
        </div>

        <div>
          <h3 className="flex items-center gap-2 font-semibold"><ListChecks className="h-4 w-4 text-primary" /> সেটআপের ধাপ</h3>
          <ol className="mt-3 space-y-4">
            <Step n={1} title="SMS phone key তৈরি করুন">
              উপরের "API keys" ফর্মে একটি লেবেল লিখুন, scope হিসেবে <strong>SMS phone</strong> বেছে নিন এবং এই ফোনটি যে স্টোরের পেমেন্ট পড়বে সেই <strong>merchant</strong> নির্বাচন করুন। তৈরি হওয়া key (<code className="font-mono text-xs">npk_…</code>) সাথে সাথে কপি করুন—পরে আর দেখা যাবে না।
            </Step>
            <Step n={2} title="ফোনে অ্যাপ ইনস্টল করুন">
              উপরের ডাউনলোড বোতাম থেকে APK নামিয়ে ফোনে ইনস্টল করুন। Android "unknown sources" অনুমতি চাইলে সেটআপের সময় অনুমতি দিন।
            </Step>
            <Step n={3} title="অ্যাপে URL ও key দিন">
              অ্যাপ প্রথমবার খুললে <strong>API URL</strong> ঘরে উপরের ঠিকানাটি (শুধু সাইটের ঠিকানা দিলেও চলবে) এবং <strong>API key</strong> ঘরে <code className="font-mono text-xs">npk_…</code> key-টি দিয়ে সংরক্ষণ করুন।
            </Step>
            <Step n={4} title="অনুমতিগুলো দিন">
              অ্যাপের settings পর্দা থেকে <strong>SMS পড়া</strong>, <strong>নোটিফিকেশন</strong> এবং <strong>ব্যাটারি অপ্টিমাইজেশন বন্ধ</strong>—প্রতিটির পাশের fix বোতাম চাপুন। সবগুলো সবুজ হলে ফোনটি প্রস্তুত।
            </Step>
            <Step n={5} title="কাজ শুরু">
              ফোনে আগের wallet SMS একবার আমদানি হয়, এরপর নতুন SMS আসামাত্র পাঠানো হয়। এই পেজের "Connected phones" ও "Collected SMS" তালিকায় ফোন ও বার্তা দেখা যাবে।
            </Step>
          </ol>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border p-3">
            <KeyRound className="h-4 w-4 text-primary" />
            <p className="mt-1.5 text-sm font-semibold">Key নিরাপদ রাখুন</p>
            <p className="mt-0.5 text-xs text-muted-foreground">SMS key শুধু সেই ফোনে দিন। ফোন হারালে বা বদলালে এখান থেকে key disable করে নতুন key তৈরি করুন।</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <Link2 className="h-4 w-4 text-primary" />
            <p className="mt-1.5 text-sm font-semibold">এক key = এক স্টোর</p>
            <p className="mt-0.5 text-xs text-muted-foreground">প্রতিটি key একটি merchant-এর সাথে বাঁধা। আলাদা স্টোরের জন্য আলাদা key ও আলাদা ফোন ব্যবহার করুন।</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <p className="mt-1.5 text-sm font-semibold">যা যা পড়া হয়</p>
            <p className="mt-0.5 text-xs text-muted-foreground">শুধু bKash, Nagad, Upay ও Rocket-এর বার্তাই ফোন থেকে যায়—ব্যক্তিগত SMS ফোনেই থেকে যায়।</p>
          </div>
        </div>
      </div>
    </Panel>
  );
}
