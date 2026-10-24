import { Button } from "@/components/ui/button";
import { brandHead } from "@/lib/brand";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { createPaymentLink, listMerchants } from "@/lib/serverfns/admin";
import { PageHeader, Panel, fieldClass } from "@/components/admin-ui";

export const Route = createFileRoute("/_authenticated/admin/links")({
  head: () => brandHead("Payment links", "Create shareable payment links in Neext Pay."),
  component: Links,
});

const empty = { merchantId: "", amount: "", orderId: "", customerName: "", customerPhone: "", redirectUrl: "", callbackUrl: "" };

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="block space-y-1.5"><span className="text-sm font-medium">{label}</span>{children}{hint && <span className="block text-xs text-muted-foreground">{hint}</span>}</label>;
}

function Links() {
  const list = useServerFn(listMerchants);
  const create = useServerFn(createPaymentLink);
  const { data: merchants } = useQuery({ queryKey: ["merchants"], queryFn: () => list() });
  const active = (merchants ?? []).filter((m: any) => m.is_active);
  const [form, setForm] = useState(empty);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await create({ data: { ...form, amount: Number(form.amount) } });
      setLink(`${window.location.origin}/pay/${r.id}`);
      setForm({ ...empty, merchantId: form.merchantId });
      toast.success("Payment link created");
    } catch (x) { toast.error((x as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Collect" title="Payment links" description="Create a checkout page for one order and share it with your customer." />
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Panel title="New link">
          <form onSubmit={submit} className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Merchant">
                <select required value={form.merchantId} onChange={set("merchantId")} className={fieldClass}>
                  <option value="">Select merchant</option>
                  {active.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </Field>
              {merchants && active.length === 0 && <p className="mt-2 text-xs text-muted-foreground">No active merchants. <Link to="/admin/merchants" className="font-semibold text-primary">Add one first</Link>.</p>}
            </div>
            <Field label="Amount (৳)"><input required type="number" min="1" step="0.01" placeholder="500" value={form.amount} onChange={set("amount")} className={fieldClass} /></Field>
            <Field label="Order ID"><input placeholder="ORD-1001" value={form.orderId} onChange={set("orderId")} className={fieldClass} /></Field>
            <Field label="Customer name"><input placeholder="Optional" value={form.customerName} onChange={set("customerName")} className={fieldClass} /></Field>
            <Field label="Customer phone"><input placeholder="Optional" value={form.customerPhone} onChange={set("customerPhone")} className={fieldClass} /></Field>
            <div className="sm:col-span-2"><Field label="Redirect URL" hint="Where the customer goes after paying."><input type="url" placeholder="https://yourshop.com/thanks" value={form.redirectUrl} onChange={set("redirectUrl")} className={fieldClass} /></Field></div>
            <div className="sm:col-span-2"><Field label="Callback URL" hint="Your server is notified here when the payment is verified."><input type="url" placeholder="https://yourshop.com/api/paid" value={form.callbackUrl} onChange={set("callbackUrl")} className={fieldClass} /></Field></div>
            <Button disabled={busy} size="lg" className="sm:col-span-2">{busy ? "Creating…" : "Create link"}</Button>
          </form>
        </Panel>
        <Panel title="Share">
          {link ? (
            <div className="space-y-4 p-5">
              <p className="text-sm text-muted-foreground">Send this link to your customer:</p>
              <p className="break-all rounded-lg bg-muted px-3 py-3 font-mono text-sm">{link}</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copied"); }}><Copy /> Copy</Button>
                <Button asChild variant="secondary"><a href={link} target="_blank" rel="noreferrer"><ExternalLink /> Open</a></Button>
              </div>
            </div>
          ) : <p className="p-5 text-sm text-muted-foreground">Your new link will appear here.</p>}
        </Panel>
      </div>
    </div>
  );
}
