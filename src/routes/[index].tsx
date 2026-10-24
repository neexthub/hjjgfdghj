import { createFileRoute, redirect } from "@tanstack/react-router";

// Compatibility for bookmarks and preview tabs that use /index.
export const Route = createFileRoute("/index")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
});