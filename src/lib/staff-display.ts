import { roundMoney } from "@/lib/money";

/** Route the UI command only; the existing server action still validates funding and permissions. */
export async function submitStaffStatus(
  vars: { dealId: string; status: string; reason: string },
  cancel: (input: { data: { action: "cancel"; dealId: string; note: string } }) => Promise<unknown>,
  setStatus: (input: { data: typeof vars }) => Promise<unknown>,
) {
  if (vars.reason.trim().length < 3) throw new Error("A reason is required.");
  return vars.status === "cancelled"
    ? cancel({ data: { action: "cancel", dealId: vars.dealId, note: vars.reason.trim() } })
    : setStatus({ data: vars });
}

export function splitDisplay(held: number, buyerPercent: number, currency: string) {
  const release = roundMoney(held * (100 - buyerPercent) / 100, currency);
  return { release, refund: roundMoney(held - release, currency) };
}