import { ShieldCheck, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NeextBrand } from "@/components/neext-brand";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PaySuccess } from "@/components/pay-success";
import {
  PROVIDER_BRAND,
  ProviderLogo,
  buildPaySteps,
  formatBdt,
  isProviderId,
} from "@/lib/providers";
import {
  fetchPayWindow,
  verifyTrx,
  type PayWindowData,
  type VerifyResult,
} from "@/lib/pay-window";

export const Route = createFileRoute("/pay/$id/$provider")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { type?: "personal" | "merchant" } =>
    search["type"] === "merchant" || search["type"] === "personal" ? { type: search["type"] } : {},
  head: ({ params }: { params: { provider: string } }) => ({
    meta: [
      {
        title: `${PROVIDER_BRAND[isProviderId(params.provider) ? params.provider : "nagad"].label} payment — Neext Pay`,
      },
      {
        name: "description", content:
          "Copy the number, pay from your wallet app, then enter your transaction ID to verify instantly.",
      },
      { property: "og:title", content: "Wallet verification — Neext Pay" },
      { property: "og:description", content: "Verify your wallet transaction securely with Neext Pay." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProviderPayPage,
});

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" strokeLinecap="round" />
    </svg>
  );
}

function ProviderPayPage() {
  const { id, provider: providerParam } = Route.useParams();
  const { type } = Route.useSearch();
  const valid = isProviderId(providerParam);
  const provider = valid ? providerParam : "nagad";
  const brand = PROVIDER_BRAND[provider];

  const [info, setInfo] = useState<PayWindowData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "verifying" | "complete">("loading");
  const [notice, setNotice] = useState<string | null>(null);
  const [trx, setTrx] = useState("");
  const [copied, setCopied] = useState(false);
  const retries = useRef(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetchPayWindow(id);
      if (!alive) return;
      if (!res.ok) {
        setLoadError(res.error);
        setPhase("ready");
        return;
      }
      setInfo(res.data);
      setPhase(res.data.status === "complete" ? "complete" : "ready");
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  async function verify() {
    if (!info) return;
    setPhase("verifying");
    setNotice(null);
    const data: VerifyResult = await verifyTrx(info.id, trx);
    if (data.status === "complete") {
      setPhase("complete");
      return;
    }
    retries.current += 1;
    if (data.status === "pending" && retries.current < 15) {
      setNotice(data.message ?? "Payment SMS not received yet — retrying…");
      setTimeout(() => void verify(), 4000);
      return;
    }
    setNotice(data.message ?? "Verification failed. Check the TRX ID and try again.");
    setPhase("ready");
  }

  function copyNumber() {
    if (!account) return;
    void navigator.clipboard?.writeText(account.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!valid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-2xl bg-card p-8 text-center shadow-card-lg ring-1 ring-border">
          <p className="text-sm text-destructive">Unknown payment method.</p>
          <Link to="/pay/$id" params={{ id }} className="mt-3 inline-block text-sm font-medium text-primary">
            ← Back to checkout
          </Link>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-2xl bg-card p-8 text-center shadow-card-lg ring-1 ring-border">
          <p className="text-sm text-destructive">{loadError}</p>
        </div>
      </div>
    );
  }

  if (phase === "complete" && info) {
    return <PaySuccess amount={info.amount} redirectUrl={info.redirectUrl} />;
  }

  const account = info?.accounts.find((a) => a.provider === provider && (!type || a.accountType === type))
    ?? info?.accounts.find((a) => a.provider === provider);

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-background">
      {/* Ambient provider-tinted glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64"
        style={{
          background: `radial-gradient(ellipse 90% 70% at 50% -20%, color-mix(in srgb, ${brand.color} 18%, transparent), transparent 70%)`,
        }}
      />

      <div className="relative mx-auto w-full max-w-md flex-1 px-4 pb-12 pt-7 sm:max-w-lg">
        <div className="mb-5 flex flex-col items-center gap-1.5">
          <NeextBrand />
          <p className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> নিরাপদ পেমেন্ট গেটওয়ে
          </p>
        </div>

        {/* Provider header */}
        <div
          className="flex items-center justify-center gap-3 rounded-3xl py-5 shadow-card-lg"
          style={{
            background: `linear-gradient(135deg, color-mix(in srgb, ${brand.color} 12%, var(--card)), var(--card))`,
            boxShadow: `0 16px 40px -18px color-mix(in srgb, ${brand.color} 45%, transparent)`,
          }}
        >
          <ProviderLogo provider={provider} className="h-12 sm:h-14" />
          <div>
            <p className="text-base font-extrabold text-foreground">{brand.label}</p>
            {account ? (
              <p className="text-[11px] font-semibold text-muted-foreground">
                {account.accountType === "merchant" ? "Merchant অ্যাকাউন্ট" : "Personal অ্যাকাউন্ট"}
              </p>
            ) : null}
          </div>
        </div>

        {!info || phase === "loading" ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading payment…</p>
        ) : !account ? (
          <div className="mt-4 rounded-2xl bg-card p-6 text-center shadow-card ring-1 ring-border">
            <p className="text-sm text-muted-foreground">
              {brand.label} এই পেমেন্টে চালু নেই।
            </p>
            <Link
              to="/pay/$id"
              params={{ id }}
              className="mt-3 inline-block text-sm font-medium text-primary"
            >
              ← অন্য মাধ্যম বেছে নিন
            </Link>
          </div>
        ) : (
          <>
            {/* Merchant + amount card — all details visible */}
            <div className="mt-4 overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-border">
              <div className="flex items-center gap-3 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary ring-1 ring-border">
                  {info.merchant.logoUrl ? (
                    <img
                      src={info.merchant.logoUrl}
                      alt={info.merchant.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Store aria-label={info.merchant.name} className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold text-foreground">
                    {info.merchant.name}
                  </p>
                  <p className="break-all text-xs text-muted-foreground">
                    Reference: <span className="font-mono">{info.orderId ?? "—"}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-dashed border-border bg-secondary/50 px-4 py-3">
                <span className="text-xs font-semibold text-muted-foreground">পরিশোধযোগ্য</span>
                <span className="text-2xl font-extrabold tabular-nums text-foreground">
                  ৳{formatBdt(info.amount)}
                </span>
              </div>
            </div>

            {/* Numbered instructions panel */}
            <div
              className="mt-4 rounded-3xl p-5 text-primary-foreground"
              style={{
                background: `linear-gradient(160deg, ${brand.panelColor}, color-mix(in srgb, ${brand.panelColor} 78%, black))`,
                boxShadow: `0 20px 44px -18px color-mix(in srgb, ${brand.panelColor} 55%, transparent)`,
              }}
            >
              <p className="mb-4 rounded-xl bg-card/95 px-3 py-2 text-center text-sm font-bold text-foreground shadow-sm">
                নিচের ধাপগুলো অনুসরণ করুন
              </p>
              <ol className="space-y-3 text-xs leading-relaxed">
                {buildPaySteps(provider, account.accountType, account.accountNumber, info.amount).map(
                  (step, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-card/25 text-[10px] font-extrabold">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span>{step.text}</span>
                        {step.kind === "number" ? (
                          <span className="mt-1.5 flex flex-wrap items-center gap-2">
                            <b className="break-all rounded-lg bg-card/15 px-2.5 py-1 text-sm tracking-wide">
                              {step.number}
                            </b>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={copyNumber}
                              className="h-7 gap-1 bg-card px-2.5 text-[11px] font-bold text-foreground hover:bg-card/90"
                            >
                              <CopyIcon /> Copy
                            </Button>
                            {copied ? (
                              <span className="text-[11px] font-bold">Copied ✓</span>
                            ) : null}
                          </span>
                        ) : null}
                        {step.kind === "amount" ? (
                          <b className="text-sm">
                            {" "}
                            ৳{step.amount}
                          </b>
                        ) : null}
                      </div>
                    </li>
                  ),
                )}
              </ol>

              {/* TRX input inside the branded panel */}
              <input
                value={trx}
                onChange={(e) => setTrx(e.target.value.toUpperCase())}
                placeholder="Transaction ID লিখুন"
                aria-label="Transaction ID"
                autoComplete="off"
                className="mt-5 w-full rounded-xl border-0 bg-card px-4 py-3 text-sm font-semibold tracking-wide text-foreground shadow-inner outline-none ring-2 ring-transparent transition placeholder:font-normal placeholder:text-muted-foreground focus:ring-card/60"
              />
            </div>

            {notice ? (
              <p className="mt-3 rounded-xl bg-card px-3 py-2.5 text-center text-xs font-medium text-foreground shadow-card ring-1 ring-border">
                {notice}
              </p>
            ) : null}

            <Button
              type="button"
              onClick={() => void verify()}
              disabled={phase === "verifying" || trx.trim().length < 4}
              size="lg"
              className="mt-4 h-12 w-full rounded-2xl text-sm font-extrabold tracking-wide text-primary-foreground transition hover:opacity-90"
              style={{
                background: `linear-gradient(135deg, ${brand.color}, color-mix(in srgb, ${brand.color} 80%, black))`,
                boxShadow: `0 14px 32px -12px color-mix(in srgb, ${brand.color} 60%, transparent)`,
              }}
            >
              {phase === "verifying" ? "VERIFYING…" : "VERIFY"}
            </Button>

            <Link
              to="/pay/$id"
              params={{ id }}
              className="mt-4 block text-center text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              ← অন্য পেমেন্ট মাধ্যম
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
