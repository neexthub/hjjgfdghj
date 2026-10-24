import { Button } from "@/components/ui/button";
import { brandHead } from "@/lib/brand";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Pencil, Plus, Store, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { deleteMerchant, deleteMerchantAccount, listMerchants, saveMerchant, saveMerchantAccount } from "@/lib/serverfns/admin";
import type { Database } from "@/integrations/supabase/types";
import { EmptyState, LoadingRows, PageHeader, Panel, StatusBadge, fieldClass } from "@/components/admin-ui";
import { PROVIDER_ORDER, PROVIDER_BRAND, ProviderLogo, type Provider } from "@/lib/providers";

type MerchantAccount = Database["public"]["Tables"]["merchant_accounts"]["Row"];
type Merchant = Database["public"]["Tables"]["merchants"]["Row"] & { merchant_accounts: MerchantAccount[] };

export const Route = createFileRoute("/_authenticated/admin/merchants")({
  head: () => brandHead("Merchants", "Manage merchants and collection accounts in Neext Pay."),
  component: Merchants,
});

const ACCOUNT_RE = /^01[3-9][0-9]{8,9}$/;
const emptyAccount = { provider: "nagad" as Provider, accountNumber: "", accountType: "personal" };

function AccountFields({ value, onChange }: { value: typeof emptyAccount; onChange: (v: typeof emptyAccount) => void }) {
  return (
    <>
      <select aria-label="Provider" value={value.provider} onChange={(e) => onChange({ ...value, provider: e.target.value as Provider })} className={fieldClass}>
        {PROVIDER_ORDER.map((p) => <option key={p} value={p}>{PROVIDER_BRAND[p].label}</option>)}
      </select>
      <select aria-label="Account type" value={value.accountType} onChange={(e) => onChange({ ...value, accountType: e.target.value })} className={fieldClass}>
        <option value="personal">Personal</option>
        <option value="merchant">Merchant</option>
      </select>
      <input required inputMode="numeric" placeholder="01XXXXXXXXX" aria-label="Account number" value={value.accountNumber} onChange={(e) => onChange({ ...value, accountNumber: e.target.value.replace(/\D/g, "") })} className={fieldClass} />
    </>
  );
}

async function fileToLogo(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const size = 256; const c = document.createElement("canvas"); c.width = size; c.height = size;
    const ctx = c.getContext("2d")!; const r = Math.max(size / img.width, size / img.height);
    const w = img.width * r, h = img.height * r; ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
    return c.toDataURL("image/webp", 0.85);
  } finally { URL.revokeObjectURL(url); }
}

export function MerchantLogo({ src, className = "h-12 w-12" }: { src?: string | null; className?: string }) {
  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary ring-1 ring-border ${className}`}>
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <Store className="h-1/2 w-1/2 text-muted-foreground" />}
    </div>
  );
}

function LogoPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <MerchantLogo src={value} className="h-10 w-10" />
      <label className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-md border border-input px-3 text-sm font-medium hover:bg-accent">
        <Upload className="h-4 w-4" /> Logo
        <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; try { onChange(await fileToLogo(f)); } catch (x) { toast.error((x as Error).message); } }} />
      </label>
      {value && <button type="button" aria-label="Remove logo" onClick={() => onChange("")} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
    </div>
  );
}

function Merchants() {
  const list = useServerFn(listMerchants);
  const save = useServerFn(saveMerchant);
  const saveAccount = useServerFn(saveMerchantAccount);
  const removeMerchant = useServerFn(deleteMerchant);
  const removeAccount = useServerFn(deleteMerchantAccount);
  const [logo, setLogo] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string; logo: string } | null>(null);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<Merchant[]>({ queryKey: ["merchants"], queryFn: () => list() });
  const [name, setName] = useState("");
  const [acct, setAcct] = useState(emptyAccount);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [extra, setExtra] = useState(emptyAccount);
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["merchants"] });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!ACCOUNT_RE.test(acct.accountNumber)) { toast.error("Enter a valid account number, e.g. 01712345678"); return; }
    setBusy(true);
    try {
      const merchant = await save({ data: { name, logoUrl: logo } });
      await saveAccount({ data: { merchantId: merchant.id, ...acct } });
      setName(""); setLogo(""); setAcct(emptyAccount);
      toast.success("Merchant added");
      refresh();
    } catch (x) { toast.error((x as Error).message); } finally { setBusy(false); }
  }

  async function addAccount(e: React.FormEvent, merchantId: string) {
    e.preventDefault();
    if (!ACCOUNT_RE.test(extra.accountNumber)) { toast.error("Enter a valid account number, e.g. 01712345678"); return; }
    try {
      await saveAccount({ data: { merchantId, ...extra } });
      setAddingTo(null); setExtra(emptyAccount);
      toast.success("Account added");
      refresh();
    } catch (x) { toast.error((x as Error).message); }
  }

  async function toggle(m: Merchant) {
    try {
      await save({ data: { id: m.id, name: m.name, logoUrl: m.logo_url ?? "", isActive: !m.is_active } });
      refresh();
    } catch (x) { toast.error((x as Error).message); }
  }

  async function saveEdit(e: React.FormEvent, m: Merchant) {
    e.preventDefault();
    if (!editing) return;
    try {
      await save({ data: { id: m.id, name: editing.name, logoUrl: editing.logo, isActive: m.is_active } });
      setEditing(null); toast.success("Merchant updated"); refresh();
    } catch (x) { toast.error((x as Error).message); }
  }

  async function delMerchant(m: Merchant) {
    if (!confirm(`Delete ${m.name}? Its accounts and API keys will be removed.`)) return;
    try { await removeMerchant({ data: { id: m.id } }); toast.success("Merchant deleted"); refresh(); qc.invalidateQueries({ queryKey: ["keys"] }); }
    catch (x) { toast.error((x as Error).message); }
  }

  async function delAccount(a: MerchantAccount) {
    if (!confirm(`Remove account ${a.account_number}?`)) return;
    try { await removeAccount({ data: { id: a.id } }); refresh(); } catch (x) { toast.error((x as Error).message); }
  }

  async function toggleAccount(m: Merchant, a: MerchantAccount) {
    try {
      await saveAccount({ data: { id: a.id, merchantId: m.id, provider: a.provider, accountNumber: a.account_number, accountType: a.account_type, isActive: !a.is_active } });
      refresh();
    } catch (x) { toast.error((x as Error).message); }
  }

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Accounts" title="Merchants" description="Each merchant receives payments into one or more bKash, Nagad, Upay or Rocket numbers." />
      <Panel title="Add merchant">
        <form onSubmit={add} className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-[auto_1.4fr_1fr_1fr_1.2fr_auto]">
          <LogoPicker value={logo} onChange={setLogo} />
          <input required placeholder="Merchant name" aria-label="Merchant name" value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
          <AccountFields value={acct} onChange={setAcct} />
          <Button disabled={busy} className="h-10"><Plus /> Add</Button>
        </form>
      </Panel>
      <Panel title={`All merchants${data ? ` (${data.length})` : ""}`}>
        {isLoading ? <LoadingRows /> : !data?.length ? <EmptyState title="No merchants yet" hint="Add your first merchant above." /> : (
          <div className="divide-y divide-border">
            {data.map((m) => (
              <div key={m.id} className="space-y-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                  <MerchantLogo src={m.logo_url} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><p className="text-lg font-bold">{m.name}</p><StatusBadge status={m.is_active ? "active" : "inactive"} /></div>
                    <button type="button" onClick={() => { navigator.clipboard.writeText(m.id); toast.success("Merchant ID copied"); }} className="mt-1 inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground">
                      ID {m.id} <Copy className="h-3 w-3" />
                    </button>
                    {m.callback_secret && (
                      <button type="button" onClick={() => { navigator.clipboard.writeText(m.callback_secret ?? ""); toast.success("Callback secret copied"); }} className="ml-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                        Copy callback secret <Copy className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing(editing?.id === m.id ? null : { id: m.id, name: m.name, logo: m.logo_url ?? "" })}><Pencil /> Edit</Button>
                    <Button variant="outline" size="sm" onClick={() => { setAddingTo(addingTo === m.id ? null : m.id); setExtra(emptyAccount); }}><Plus /> Account</Button>
                    <Button variant={m.is_active ? "ghost" : "secondary"} size="sm" onClick={() => toggle(m)}>{m.is_active ? "Deactivate" : "Activate"}</Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => delMerchant(m)}><Trash2 /> Delete</Button>
                  </div>
                </div>
                {editing?.id === m.id && (
                  <form onSubmit={(e) => saveEdit(e, m)} className="grid gap-2 rounded-lg bg-muted/50 p-3 sm:grid-cols-[auto_1fr_auto]">
                    <LogoPicker value={editing.logo} onChange={(v) => setEditing({ ...editing, logo: v })} />
                    <input required aria-label="Edit merchant name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={fieldClass} />
                    <Button className="h-10">Save changes</Button>
                  </form>
                )}
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {m.merchant_accounts.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <ProviderLogo provider={a.provider as Provider} className="h-8" />
                        <div><p className="font-mono text-sm font-semibold">{a.account_number}</p><p className="text-xs capitalize text-muted-foreground">{a.account_type}</p></div>
                      </div>
                      <button type="button" onClick={() => toggleAccount(m, a)} className="text-xs font-semibold text-muted-foreground hover:text-foreground">{a.is_active ? "On" : "Off"}</button>
                      <button type="button" aria-label="Remove account" onClick={() => delAccount(a)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
                {addingTo === m.id && (
                  <form onSubmit={(e) => addAccount(e, m.id)} className="grid gap-2 rounded-lg bg-muted/50 p-3 sm:grid-cols-[1fr_1fr_1.2fr_auto]">
                    <AccountFields value={extra} onChange={setExtra} />
                    <Button className="h-10">Save</Button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
