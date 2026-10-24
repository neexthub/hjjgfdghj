import { createFileRoute, redirect } from "@tanstack/react-router";
import { brandHead } from "@/lib/brand";

// Compatibility for bookmarks and preview tabs that use /index.
export const Route = createFileRoute("/index")({
  head: () => brandHead("Homepage redirect", "Continue to the Neext Pay homepage."),
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
});