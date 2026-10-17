export type PaymentProvider = {
  id: string;
  label: string;
  connected: boolean;
  /** Message shown to both parties while no live provider is connected. */
  notice: string;
};

/**
 * Resolves the active payment provider from server secrets.
 * When no provider key is present, Insight runs in manual settlement mode:
 * every money movement is still recorded and confirmed by the Insight team.
 */
export function getPaymentProvider(): PaymentProvider {
  const stripe = process.env["STRIPE_SECRET_KEY"];
  if (stripe && stripe.length > 10) {
    return {
      id: "stripe",
      label: "Payment provider",
      connected: true,
      notice: "Funds are held by a licensed payment provider. Insight runs the deal rules and keeps the record.",
    };
  }
  return {
    id: "manual",
    label: "Payment provider simulation",
    connected: false,
    notice:
      "Escrow demo. The payment provider is simulated and no real money moves. At launch, funds will be held by a licensed payment provider; Insight runs the deal rules and keeps the record.",
  };
}
