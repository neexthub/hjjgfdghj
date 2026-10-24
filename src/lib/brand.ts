export const PAYMENT_INTRO_MS = 1800;
export function shouldShowIntro(pathname: string) { return pathname === "/admin" || pathname.startsWith("/admin/") || /^\/pay\/[^/]+/.test(pathname); }
export function brandHead(title: string, description: string) {
  return { meta: [
    { title: `${title} — Neext Pay` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — Neext Pay` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] };
}