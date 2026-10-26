import { ShieldCheck, Store } from "lucide-react";
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

function Checkout() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [info, setInfo] = useState<PayWindowData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

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
        <div className="w-full max-w-sm rounded-2xl bg-card p-8 text-center shadow-card-lg ring-1 ring-border">
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

  // One tile per active wallet account, so personal and merchant both show.
  type Tile = { provider: (typeof PROVIDER_ORDER)[number]; account: PayAccount | null };
  const tiles: Tile[] = PROVIDER_ORDER.flatMap((p): Tile[] => {
    const list = info.accounts
      .filter((a) => a.provider === p)
      .sort((a, b) => a.accountType.localeCompare(b.accountType));
    return list.length ? list.map((account) => ({ provider: p, account })) : [{ provider: p, account: null }];
  });

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-background">
      {/* Ambient brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 50% -20%, color-mix(in oklab, var(--primary) 16%, transparent), transparent 70%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-md flex-1 px-4 pb-32 pt-8 sm:max-w-lg">
        <div className="mb-6 flex flex-col items-center gap-1.5">
          <NeextBrand />
          <p className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> নিরাপদ পেমেন্ট গেটওয়ে
          </p>
        </div>

        {/* Merchant + amount hero — everything visible, nothing hidden */}
        <div className="overflow-hidden rounded-3xl bg-card shadow-card-lg ring-1 ring-border">
          <div className="flex items-center gap-4 p-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-secondary ring-1 ring-border">
              {info.merchant.logoUrl ? (
                <img src={info.merchant.logoUrl} alt={info.merchant.name} className="h-full w-full object-cover" />
              ) : (
                <Store aria-label={info.merchant.name} className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="break-words text-lg font-bold leading-snug">{info.merchant.name}</p>
              <p className="mt-0.5 break-all text-xs text-muted-foreground">
                Reference: <span className="font-mono">{info.orderId ?? "—"}</span>
              </p>
            </div>
          </div>

          <div className="border-t border-dashed border-border bg-secondary/50 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">পরিশোধযোগ্য পরিমাণ</p>
            <p className="mt-1 text-3xl font-extrabold tabular-nums text-primary sm:text-4xl">
              ৳{formatBdt(info.amount)}
            </p>
          </div>
        </div>

        <p className="mb-3 mt-7 text-sm font-semibold text-muted-foreground">
          মোবাইল ব্যাংকিং — পেমেন্ট মাধ্যম বেছে নিন
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tiles.map(({ provider: p, account }) => {
            const brand = PROVIDER_BRAND[p];
            return (
              <button
                key={`${p}-${account?.accountType ?? "off"}`}
                type="button"
                aria-label={brand.label}
                disabled={!account}
                title={account ? undefined : `${brand.label} এই পেমেন্টে চালু নেই`}
                onClick={() => navigate({ to: "/pay/$id/$provider", params: { id, provider: p }, search: { type: account?.accountType === "merchant" ? "merchant" : "personal" } })}
                className="group relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-border bg-card px-3 py-4 shadow-card transition duration-200 hover:-translate-y-1 hover:border-primary hover:shadow-card-lg disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0 disabled:hover:shadow-card"
              >
                <ProviderLogo provider={p} className="h-14 sm:h-16" />
                <span className="text-xs font-bold text-foreground">{brand.label}</span>
                {account ? (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                    {account.accountType === "merchant" ? "Merchant" : "Personal"}
                  </span>
                ) : (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    Not available
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
          পেমেন্ট সম্পন্ন করে Transaction ID দিয়ে ভেরিফাই করলেই অর্ডার কনফার্ম হবে।
        </p>
      </div>

      {/* Sticky pay summary bar */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-sidebar-border bg-sidebar/95 py-3.5 text-center text-sidebar-foreground backdrop-blur">
        <p className="text-base font-bold">
          Pay <span className="text-brand-lime">৳{formatBdt(info.amount)}</span> BDT
        </p>
        <p className="mt-0.5 text-[10px] text-sidebar-foreground/60">Secured by Neext Pay</p>
      </div>
    </div>
  );
}
