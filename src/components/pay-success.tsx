import { useEffect } from "react";
import { formatBdt } from "@/lib/providers";

/** Shared "payment verified" screen shown after a successful verification. */
export function PaySuccess({
  amount,
  redirectUrl,
}: {
  amount: number | string;
  redirectUrl: string | null;
}) {
  useEffect(() => {
    if (!redirectUrl) return;
    const timer = setTimeout(() => {
      window.location.href = redirectUrl;
    }, 2500);
    return () => clearTimeout(timer);
  }, [redirectUrl]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-card-lg">
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success text-3xl font-bold text-success-foreground">
          ✓
        </div>
        <h2 className="mt-4 text-xl font-bold text-foreground">Payment verified</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          ৳{formatBdt(amount)} received.
        </p>
        {redirectUrl ? (
          <p className="mt-3 text-xs text-muted-foreground">Redirecting you back…</p>
        ) : null}
      </div>
    </div>
  );
}
