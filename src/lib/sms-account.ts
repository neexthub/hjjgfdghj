import { z } from "zod";
import { normalizePhone } from "@/lib/sms";

export const ingestSchema = z.object({
  deviceId: z.string().min(1).max(64),
  platform: z.enum(["android", "ios", "other"]).default("android"),
  phoneNumber: z.string().regex(/^(?:\+?88)?01[3-9][0-9]{8,9}$/).optional(),
  messages: z.array(z.object({ sender: z.string().min(1).max(64), body: z.string().min(1).max(4000), receivedAt: z.string().datetime().optional() })).min(1).max(200),
});

type Account = { merchant_id: string; provider: string; account_type: string; account_number: string };
export function resolveSmsAccount(accounts: Account[], merchantId: string | null, provider: string, accountType: string, receiver: string | null): Account | null {
  const digits = (value: string) => value.replace(/\D/g, "");
  const matches = accounts.filter(a => (!merchantId || a.merchant_id === merchantId) && a.provider === provider && a.account_type === accountType
    && (!receiver || digits(a.account_number) === digits(normalizePhone(receiver) ?? receiver)));
  // Never infer another store from an unbound key or guess between collection wallets.
  if (!receiver && !merchantId) return null;
  return matches.length === 1 ? matches[0] ?? null : null;
}