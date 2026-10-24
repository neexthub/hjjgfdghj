import { brandHead } from "@/lib/brand";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpRight, CheckCircle2, Clock, Coins, Receipt } from "lucide-react";
import { getDashboard } from "@/lib/serverfns/admin";
import { EmptyState, LoadingRows, PageHeader, Panel, StatusBadge } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { formatBdt } from "@/lib/providers";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => brandHead("Dashboard", "Payment overview for the Neext Pay gateway."),
  component: Dashboard,
});

function Dashboard() {
  const fn = useServerFn(getDashboard);
  const { data, isLoading, error } = useQuery({ queryKey: ["dashboard"], queryFn: () => fn() });
  const stats = [
    { label: "Total payments", value: data?.totalPayments ?? 0, icon: Receipt },
    { label: "Completed", value: data?.completedCount ?? 0, icon: CheckCircle2 },
    { label: "Pending", value: data?.pendingCount ?? 0, icon: Clock },
    { label: "Collected", value: "৳" + formatBdt(data?.completedTotal ?? 0), icon: Coins, highlight: true },
  ];
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Live summary of payments collected through your accounts."
        actions={<Button asChild><Link to="/admin/links">New payment link <ArrowUpRight /></Link></Button>}
      />
      {error && <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{(error as Error).message}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, highlight }) => (
          <div key={label} className={highlight ? "rounded-xl bg-sidebar p-5 text-sidebar-foreground shadow-card-lg" : "rounded-xl border border-border bg-card p-5 shadow-card"}>
            <div className="flex items-center justify-between">
              <p className={highlight ? "text-sm text-sidebar-foreground/70" : "text-sm text-muted-foreground"}>{label}</p>
              <Icon className={highlight ? "h-4 w-4 text-brand-lime" : "h-4 w-4 text-primary"} />
            </div>
            <p className="mt-3 text-3xl font-extrabold tabular-nums">{isLoading ? "—" : value}</p>
          </div>
        ))}
      </div>
      <Panel title="Recent payments" action={<Link to="/admin/transactions" className="text-sm font-semibold text-primary hover:underline">View all</Link>}>
        {isLoading ? <LoadingRows /> : !data?.recent.length ? (
          <EmptyState title="No payments yet" hint="Create a payment link to collect your first payment." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr><th className="px-5 py-3 font-semibold">Order</th><th className="px-5 py-3 font-semibold">Merchant</th><th className="px-5 py-3 font-semibold">Amount</th><th className="px-5 py-3 font-semibold">Status</th><th className="px-5 py-3 font-semibold">Created</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.recent.map((r: any) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-5 py-3.5 font-medium">{r.order_id ?? r.id.slice(0, 8)}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{r.merchants?.name ?? "—"}</td>
                    <td className="px-5 py-3.5 font-semibold tabular-nums">{"৳" + formatBdt(r.amount)}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={r.status} /></td>
                    <td className="px-5 py-3.5 text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
