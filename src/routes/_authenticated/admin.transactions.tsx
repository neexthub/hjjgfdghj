import { Button } from "@/components/ui/button";
import { brandHead } from "@/lib/brand";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { listTransactions, updatePaymentStatus } from "@/lib/serverfns/admin";
import { EmptyState, LoadingRows, PageHeader, Panel, StatusBadge, fieldClass } from "@/components/admin-ui";
import { formatBdt } from "@/lib/providers";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/transactions")({
  head: () => brandHead("Transactions", "Search and manage payments in Neext Pay."),
  component: Transactions,
});

const FILTERS = ["all", "pending", "complete", "failed"] as const;

function Transactions() {
  const [status, setStatus] = useState<string>("all");
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => { const t = setTimeout(() => setSearch(input), 300); return () => clearTimeout(t); }, [input]);
  const list = useServerFn(listTransactions);
  const update = useServerFn(updatePaymentStatus);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["tx", status, search], queryFn: () => list({ data: { status, search } }) });

  async function setTo(id: string, s: "pending" | "complete" | "failed") {
    let trxId: string | undefined;
    if (s === "complete") {
      const v = prompt("Transaction ID (optional)");
      if (v === null) return;
      trxId = v || undefined;
    }
    try {
      await update({ data: { id, status: s, ...(trxId ? { trxId } : {}) } });
      toast.success(`Marked ${s}`);
      qc.invalidateQueries({ queryKey: ["tx"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (x) { toast.error((x as Error).message); }
  }

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Payments" title="Transactions" description="Every payment request and its verification status." />
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-border bg-card p-1">
          {FILTERS.map((f) => (
            <button key={f} type="button" onClick={() => setStatus(f)} className={cn("rounded-md px-3 py-1.5 text-sm capitalize transition", status === f ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{f}</button>
          ))}
        </div>
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search order, TRX ID or phone" className={cn(fieldClass, "pl-9")} />
        </div>
      </div>
      <Panel>
        {isLoading ? <LoadingRows rows={6} /> : !data?.length ? <EmptyState title="No transactions found" hint="Try another filter or search." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr><th className="px-5 py-3">Order</th><th className="px-5 py-3">Merchant</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">TRX ID</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Callback</th><th className="px-5 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((r: any) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-5 py-3.5"><p className="font-medium">{r.order_id ?? r.id.slice(0, 8)}</p><p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p></td>
                    <td className="px-5 py-3.5">{r.merchants?.name ?? "—"}{r.provider && <span className="ml-1.5 text-xs uppercase text-muted-foreground">{r.provider}</span>}</td>
                    <td className="px-5 py-3.5 font-semibold tabular-nums">{"৳" + formatBdt(r.amount)}</td>
                    <td className="px-5 py-3.5 font-mono text-xs">{r.trx_id ?? "—"}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={r.status} /></td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">{!r.callback_status || r.callback_status === "no_url" ? (r.callback_url ? "Waiting" : "—") : r.callback_status}</td>
                    <td className="space-x-1 whitespace-nowrap px-5 py-3.5 text-right">
                      {r.status !== "complete" && <Button size="sm" variant="secondary" onClick={() => setTo(r.id, "complete")}>Complete</Button>}
                      {r.status !== "failed" && <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setTo(r.id, "failed")}>Fail</Button>}
                      {r.status !== "pending" && <Button size="sm" variant="ghost" onClick={() => setTo(r.id, "pending")}>Reset</Button>}
                    </td>
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
