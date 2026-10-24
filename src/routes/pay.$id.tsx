import { createFileRoute, Outlet } from "@tanstack/react-router";
import { brandHead } from "@/lib/brand";

// Layout route for the payment window: hosts the checkout (/pay/$id) and the
// per-provider instruction pages (/pay/$id/$provider). No component of its own
// — the matched child renders directly.
export const Route = createFileRoute("/pay/$id")({
  head: () => brandHead("Secure checkout", "Complete your wallet payment with Neext Pay."),
  ssr: false,
  component: Outlet,
});
