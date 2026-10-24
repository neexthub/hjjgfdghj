import { NeextBrand } from "@/components/neext-brand";
import { Button } from "@/components/ui/button";
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Activity, ArrowLeftRight, KeyRound, Link2, LogOut, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Dashboard", match: "exact", icon: Activity },
  { to: "/admin/transactions", label: "Transactions", match: "prefix", icon: ArrowLeftRight },
  { to: "/admin/merchants", label: "Merchants", match: "exact", icon: Store },
  { to: "/admin/links", label: "Payment links", match: "exact", icon: Link2 },
  { to: "/admin/api-keys", label: "API & phones", match: "exact", icon: KeyRound },
] as const;

function AdminLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (item: (typeof NAV)[number]) =>
    item.match === "exact" ? pathname === item.to || pathname === item.to + "/" : pathname.startsWith(item.to);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <Link to="/" className="flex items-center gap-2 px-6 py-6">
          <NeextBrand />
        </Link>
        <p className="px-6 pb-2 text-[11px] font-bold uppercase tracking-wider text-sidebar-foreground/45">Workspace</p>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-semibold text-sidebar-foreground before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-brand-lime"
                    : "text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <Icon className={cn("h-4 w-4", active && "text-brand-lime")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <Button
            type="button"
            variant="ghost"
            onClick={signOut}
            className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          >
            <LogOut /> Sign out
          </Button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
          <NeextBrand />
          <Button type="button" variant="ghost" size="sm" onClick={signOut}>
            <LogOut /> Sign out
          </Button>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card px-3 py-2 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm",
                isActive(item) ? "bg-accent font-semibold text-accent-foreground" : "text-muted-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
