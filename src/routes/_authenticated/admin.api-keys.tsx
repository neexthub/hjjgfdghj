import { Button } from "@/components/ui/button";
import { brandHead } from "@/lib/brand";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, KeyRound, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { createApiKey, deleteApiKey, listApiKeys, listGateway, toggleApiKey } from "@/lib/serverfns/admin";
import { EmptyState, LoadingRows, PageHeader, Panel, StatusBadge, fieldClass } from "@/components/admin-ui";
import { formatBdt } from "@/lib/providers";

export const Route = createFileRoute("/_authenticated/admin/api-keys")({
  head: () => brandHead("API & phones", "Manage API keys, connected phones and collected SMS in Neext Pay."),
  component: ApiKeys,
});

function ApiKeys() {
  const list = useServerFn(listApiKeys);
  const create = useServerFn(createApiKey);
  const toggle = useServerFn(toggleApiKey);
  const remove = useServerFn(deleteApiKey);
  const gateway = useServerFn(listGateway);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["keys"], queryFn: () => list() });
  const { data: gw } = useQuery({ queryKey: ["gateway"], queryFn: () => gateway() });
  const [label, setLabel] = useState("");
  const [fresh, setFresh] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["keys"] });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    try {
      const r = await create({ data: { label } });
      setFresh(r.key); setLabel(""); refresh();
    } catch (x) { toast.error((x as Error).message); }
  }

  async function del(id: string) {
    if (!confirm("Delete this key? Apps using it will stop working.")) return;
    try { await remove({ data: { id } }); refresh(); } catch (x) { toast.error((x as Error).message); }
  }

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Integrations" title="API & phones" description="Keys let your website create payments and your Android phones forward payment SMS." />
      <Panel title="API keys">
        <form onSubmit={add} className="flex flex-wrap gap-2 border-b border-border p-5">
          <input required placeholder="Label, e.g. Android phone 1" value={label} onChange={(e) => setLabel(e.target.value)} className={`${fieldClass} min-w-56 flex-1`} />
          <Button className="h-10"><KeyRound /> Create key</Button>
        </form>
        {fresh && (
          <div className="m-5 rounded-lg border border-primary/40 bg-accent p-4">
            <p className="text-sm font-semibold text-accent-foreground">Copy this key now — it won't be shown again.</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 break-all rounded bg-card px-3 py-2 font-mono text-sm">{fresh}</code>
              <Button variant="outline" size="icon" aria-label="Copy key" onClick={() => { navigator.clipboard.writeText(fresh); toast.success("Key copied"); }}><Copy /></Button>
            </div>
          </div>
        )}
        {isLoading ? <LoadingRows /> : !data?.length ? <EmptyState title="No API keys yet" /> : (
          <div className="divide-y divide-border">
            {data.map((k: any) => (
              <div key={k.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <div className="flex items-center gap-2"><p className="font-semibold">{k.label}</p><StatusBadge status={k.is_active ? "active" : "inactive"} /></div>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">{k.key_prefix}… · last used {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "never"}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={async () => { await toggle({ data: { id: k.id, isActive: !k.is_active } }); refresh(); }}>{k.is_active ? "Disable" : "Enable"}</Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => del(k.id)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <Panel title="Connected phones">
          {!gw ? <LoadingRows rows={2} /> : gw.devices.length === 0 ? <EmptyState title="No phones connected yet" hint="Phones appear after they send their first SMS." /> : (
            <div className="divide-y divide-border">
              {gw.devices.map((d: any) => (
                <div key={d.id} className="flex items-center gap-3 px-5 py-4 text-sm">
                  <Smartphone className="h-5 w-5 text-primary" />
                  <div><p className="font-semibold">{d.label ?? d.phone_number ?? d.device_id}</p><p className="text-xs text-muted-foreground">Last seen {d.last_seen_at ? new Date(d.last_seen_at).toLocaleString() : "—"}</p></div>
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel title="Collected SMS">
          {!gw ? <LoadingRows rows={3} /> : gw.messages.length === 0 ? <EmptyState title="No SMS collected yet" /> : (
            <div className="max-h-[480px] divide-y divide-border overflow-y-auto">
              {gw.messages.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold">{m.trx_id ?? "—"} <span className="ml-1 uppercase text-muted-foreground">{m.provider}</span></p>
                    <p className="truncate text-xs text-muted-foreground">{m.account_number ?? m.sender} · {new Date(m.received_at).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums">{m.amount != null ? "৳" + formatBdt(m.amount) : "—"}</p>
                    <StatusBadge status={m.matched_payment_id ? "complete" : "pending"} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
