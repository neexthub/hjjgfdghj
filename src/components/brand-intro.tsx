import { useEffect, useState } from "react";
import symbol from "@/assets/neext-symbol.png";
import { PAYMENT_INTRO_MS, shouldShowIntro } from "@/lib/brand";

/** Branded splash shown only on a full load/reload of admin or payment pages — never on in-app navigation. */
export function BrandIntro() {
  const [phase, setPhase] = useState<"hidden" | "show" | "leave">("hidden");
  useEffect(() => {
    if (!shouldShowIntro(window.location.pathname)) return;
    setPhase("show");
    const leave = setTimeout(() => setPhase("leave"), PAYMENT_INTRO_MS);
    const done = setTimeout(() => setPhase("hidden"), PAYMENT_INTRO_MS + 450);
    return () => { clearTimeout(leave); clearTimeout(done); };
  }, []);
  if (phase === "hidden") return null;
  const payment = window.location.pathname.startsWith("/pay/");
  return <div className={`brand-intro ${phase === "leave" ? "brand-intro-leave" : ""}`} role="status" aria-label="Neext Pay loading">
    <div className="intro-glow" />
    <div className="intro-mark flex flex-col items-center">
      <div className="intro-logo-ring"><img src={symbol} alt="" width={1024} height={1024} className="h-14 w-14 object-contain" /></div>
      <p className="mt-6 text-2xl font-extrabold">Neext <span className="text-brand-lime">Pay</span></p>
      <p className="mt-1.5 text-xs font-medium uppercase text-brand-surface/55">{payment ? "Secure checkout" : "Merchant console"}</p>
      <div className="mt-8 h-[3px] w-44 overflow-hidden rounded-full bg-brand-surface/10"><div className="intro-progress" /></div>
    </div>
  </div>;
}
