import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, ShieldCheck, Smartphone, Zap, Link2, Store, KeyRound, Activity } from "lucide-react";
import { NeextBrand } from "@/components/neext-brand";
import { Button } from "@/components/ui/button";
import { brandHead } from "@/lib/brand";
import { ProviderLogo, PROVIDER_ORDER } from "@/lib/providers";

export const Route = createFileRoute("/")({
  head: () => brandHead("Payment workspace", "Neext Pay payment workspace for bKash, Nagad, Upay and Rocket personal and merchant accounts."),
  component: Index,
});

const STEPS = [
  { icon: Link2, title: "Create a link", text: "Make a checkout page for any order in seconds." },
  { icon: Smartphone, title: "Customer pays", text: "They send money from bKash, Nagad, Upay or Rocket." },
  { icon: Zap, title: "Auto verified", text: "Your phone forwards the SMS and the payment is confirmed." },
];

const SHORTCUTS = [
  { title: "Dashboard", to: "/admin", icon: Activity },
  { title: "Merchants", to: "/admin/merchants", icon: Store },
  { title: "Payment links", to: "/admin/links", icon: Link2 },
  { title: "API & phones", to: "/admin/api-keys", icon: KeyRound },
] as const;

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <section className="bg-sidebar text-sidebar-foreground">
        <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
          <NeextBrand />
          <Button asChild variant="secondary"><Link to="/auth">Sign in <ArrowUpRight /></Link></Button>
        </header>
        <div className="mx-auto grid max-w-6xl gap-10 px-5 pb-20 pt-12 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-sidebar-border px-3 py-1 text-xs font-semibold text-sidebar-foreground/80">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-lime" /> Merchant payment gateway
            </p>
            <h1 className="text-4xl font-extrabold leading-tight sm:text-6xl">
              Collect mobile payments. <span className="text-brand-lime">Verified automatically.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-sidebar-foreground/70">
              One workspace for your bKash, Nagad, Upay and Rocket accounts — personal or merchant.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-brand-lime text-brand-ink hover:bg-brand-lime/90"><Link to="/auth">Open workspace <ArrowUpRight /></Link></Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {PROVIDER_ORDER.map((p) => (
              <div key={p} className="flex h-24 items-center justify-center rounded-2xl bg-card px-4 shadow-card-lg">
                <ProviderLogo provider={p} className="h-10 max-w-full" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-sm font-bold uppercase tracking-wider text-primary">How it works</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Icon className="h-5 w-5" /></span>
                <span className="text-3xl font-extrabold text-muted-foreground/30">0{i + 1}</span>
              </div>
              <p className="mt-5 text-lg font-bold">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-16 text-sm font-bold uppercase tracking-wider text-primary">Go to</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SHORTCUTS.map(({ title, to, icon: Icon }) => (
            <Link key={title} to={to} className="group flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:border-primary">
              <span className="flex items-center gap-3 font-bold"><Icon className="h-5 w-5 text-primary" />{title}</span>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
            </Link>
          ))}
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-5 py-6 text-xs text-muted-foreground">
          <span>© Neext Pay</span><span>Personal & merchant accounts</span>
        </div>
      </footer>
    </div>
  );
}
