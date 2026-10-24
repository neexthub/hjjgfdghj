// Brand data, logos and Bengali payment instructions for the four supported
import bkashLogo from "@/assets/providers/bkash-logo.svg.asset.json";
import nagadLogo from "@/assets/providers/nagad-logo.svg.asset.json";
import upayLogo from "@/assets/providers/upay-logo.svg.asset.json";
import rocketLogo from "@/assets/providers/rocket-logo.svg.asset.json";

const PROVIDER_LOGO_URL: Record<string, string> = {
  bkash: bkashLogo.url,
  nagad: nagadLogo.url,
  upay: upayLogo.url,
  rocket: rocketLogo.url,
};
// MFS providers. Client-safe: no server imports.

export type Provider = "bkash" | "nagad" | "upay" | "rocket";
export type PayAccountType = "personal" | "merchant";

export const PROVIDER_ORDER: Provider[] = ["bkash", "nagad", "upay", "rocket"];

export type ProviderBrand = {
  label: string;
  /** Primary brand color (logos, buttons). */
  color: string;
  /** Background of the step-by-step instructions panel. */
  panelColor: string;
  /** Soft tint used behind logos / avatars. */
  softColor: string;
  ussd: string;
  appName: string;
  /** Wallet-app option name for personal vs merchant collection accounts. */
  options: Record<PayAccountType, string>;
};

export const PROVIDER_BRAND: Record<Provider, ProviderBrand> = {
  bkash: {
    label: "bKash",
    color: "#E2136E",
    panelColor: "#E2136E",
    softColor: "#FDE7F1",
    ussd: "*247#",
    appName: "bKash",
    options: { personal: "Send Money", merchant: "Payment" },
  },
  nagad: {
    label: "Nagad",
    color: "#EC6608",
    panelColor: "#D5252B",
    softColor: "#FDEFE3",
    ussd: "*167#",
    appName: "NAGAD",
    options: { personal: "Send Money", merchant: "Payment" },
  },
  upay: {
    label: "Upay",
    color: "#009CA6",
    panelColor: "#009CA6",
    softColor: "#E4F5F6",
    ussd: "*268#",
    appName: "Upay",
    options: { personal: "Send Money", merchant: "Payment" },
  },
  rocket: {
    label: "Rocket",
    color: "#8C3494",
    panelColor: "#8C3494",
    softColor: "#F4E8F5",
    ussd: "*322#",
    appName: "Rocket",
    options: { personal: "Send Money", merchant: "Payment" },
  },
};

/** Checkout chrome blue (tabs, pay bar) from the reference design. */
export const CHECKOUT_BLUE = "#2E6BC6";

export function isProviderId(value: string): value is Provider {
  return (PROVIDER_ORDER as string[]).includes(value);
}

export function formatBdt(amount: number | string | null | undefined): string {
  const n = Number(amount);
  return (Number.isFinite(n) ? n : 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export type PayStep =
  | { kind: "text"; text: string }
  | { kind: "number"; text: string; number: string }
  | { kind: "amount"; text: string; amount: string };

/**
 * Bengali step-by-step payment instructions, matching the reference checkout:
 * dial/app → option (Send Money for personal, Payment for merchant accounts) →
 * number + copy → charge-inclusive amount → PIN → confirmation SMS → TRX ID.
 */
export function buildPaySteps(
  provider: Provider,
  accountType: PayAccountType,
  accountNumber: string,
  amount: number | string,
): PayStep[] {
  const brand = PROVIDER_BRAND[provider];
  return [
    {
      kind: "text",
      text: `${brand.ussd} ডায়াল করুন অথবা ${brand.appName} অ্যাপে লগইন করুন`,
    },
    { kind: "text", text: `"${brand.options[accountType]}" অপশন সিলেক্ট করুন` },
    { kind: "number", text: "নিচের নাম্বারটি সেখানে লিখুন", number: accountNumber },
    { kind: "amount", text: "চার্জ সহ পরিমাণ", amount: formatBdt(amount) },
    { kind: "text", text: `নির্দেশ অনুযায়ী ${brand.label} পিন দিন` },
    {
      kind: "text",
      text: `লেনদেন সফল হলে ${brand.label} থেকে আপনার ফোনে একটি নিশ্চিতকরণ এসএমএস আসবে`,
    },
    {
      kind: "text",
      text: "অনুগ্রহ করে আপনার Transaction ID নিচের বক্সে লিখে VERIFY বাটনে চাপুন",
    },
  ];
}

/** Official provider logos for the checkout grid and headers. */
export function ProviderLogo({
  provider,
  className = "h-9",
}: {
  provider: Provider;
  className?: string;
}) {
  return (
    <img
      src={PROVIDER_LOGO_URL[provider]}
      alt={PROVIDER_BRAND[provider].label}
      className={`${className} w-auto max-w-full object-contain`}
      draggable={false}
    />
  );
}
