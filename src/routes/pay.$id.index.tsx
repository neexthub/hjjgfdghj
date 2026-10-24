import { NeextBrand } from "@/components/neext-brand";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PaySuccess } from "@/components/pay-success";
import {
  PROVIDER_BRAND,
  PROVIDER_ORDER,
  ProviderLogo,
  formatBdt,
} from "@/lib/providers";
import { fetchPayWindow, type PayAccount, type PayWindowData } from "@/lib/pay-window";

export const Route = createFileRoute("/pay/$id/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Checkout — Neext Pay" },
      {
        name: "description", content:
          "Pay with bKash, Nagad, Upay or Rocket. Copy the number, send from your wallet app, then verify with your transaction ID.",
      },
      { property: "og:title", content: "Checkout — Neext Pay" },
      {
        property: "og:description",
        content: "Pay with bKash, Nagad, Upay or Rocket and verify instantly.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Checkout,
});

function HeadsetIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" strokeLinecap="round" />
      <rect x="2" y="14" width="4" height="6" rx="2" />
      <rect x="18" y="14" width="4" height="6" rx="2" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.7 2.2c-.7.4-1.2 1-1.2 1.8" strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" strokeLinecap="round" />
      <circle cx="12" cy="8" r="0.5" fill="currentColor" />
    </svg>
  );
}

function Checkout() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [info, setInfo] = useState<PayWindowData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetchPayWindow(id);
      if (!alive) return;
      if (!res.ok) {
        setLoadError(res.error);
        return;
      }
      setInfo(res.data);
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-lg bg-card p-8 text-center shadow-xl">
          <p className="text-sm text-destructive">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading payment…</p>
      </div>
    );
  }

  if (info.status === "complete") {
    return <PaySuccess amount={info.amount} redirectUrl={info.redirectUrl} />;
  }

  const byProvider = new Map<string, PayAccount>(
    info.accounts.map((a) => [a.provider, a]),
  );
  const initial = info.merchant.name.trim().charAt(0).toUpperCase() || "M";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto w-full max-w-md flex-1 px-4 pb-28 pt-6">
        <div className="mb-6 flex justify-center"><NeextBrand /></div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-secondary ring-1 ring-border">
              {info.merchant.logoUrl ? (
                <img src={info.merchant.logoUrl} alt={info.merchant.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-extrabold text-secondary-foreground">{initial}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold">{info.merchant.name}</p>
              <p className="truncate text-xs text-muted-foreground">Reference: {info.orderId ?? "—"}</p>
            </div>
            <div className="flex gap-1.5 text-muted-foreground">
              {[HeadsetIcon, HelpIcon, InfoIcon].map((Icon, i) => (
                <span key={i} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"><Icon /></span>
              ))}
            </div>
          </div>
          <div className="mt-4 flex items-end justify-between border-t border-border pt-4">
            <span className="text-sm text-muted-foreground">পরিশোধযোগ্য</span>
            <span className="text-2xl font-extrabold tabular-nums">৳{formatBdt(info.amount)}</span>
          </div>
          <button type="button" onClick={() => setShowDetails((v) => !v)} className="mt-2 text-xs font-semibold text-primary">
            {showDetails ? "Hide details" : "View details"}
          </button>
          {showDetails ? (
            <div className="mt-2 rounded-lg bg-muted p-3 text-xs">
              <p className="flex justify-between py-0.5"><span className="text-muted-foreground">Amount</span><span className="font-semibold">৳{formatBdt(info.amount)}</span></p>
              <p className="flex justify-between py-0.5"><span className="text-muted-foreground">Reference</span><span className="font-mono">{info.orderId ?? "—"}</span></p>
            </div>
          ) : null}
        </div>

        <p className="mb-2 mt-6 text-sm font-semibold text-muted-foreground">মোবাইল ব্যাংকিং — পেমেন্ট মাধ্যম বেছে নিন</p>
        <div className="grid grid-cols-2 gap-3">
          {PROVIDER_ORDER.map((p) => {
            const account = byProvider.get(p);
            const brand = PROVIDER_BRAND[p];
            return (
              <button
                key={p}
                type="button"
                aria-label={brand.label}
                disabled={!account}
                title={account ? undefined : `${brand.label} এই পেমেন্টে চালু নেই`}
                onClick={() => navigate({ to: "/pay/$id/$provider", params: { id, provider: p } })}
                className="flex h-20 items-center justify-center rounded-xl border border-border bg-card shadow-card transition hover:-translate-y-0.5 hover:border-primary hover:shadow-card-lg disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0"
              >
                <ProviderLogo provider={p} className="h-9" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-sidebar-border bg-sidebar py-4 text-center text-sidebar-foreground">
        <p className="text-base font-bold">Pay <span className="text-brand-lime">৳{formatBdt(info.amount)}</span> BDT</p>
      </div>
    </div>
  );
}
