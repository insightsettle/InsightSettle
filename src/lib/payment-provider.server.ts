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
      label: "Stripe",
      connected: true,
      notice: "Payments are processed by Stripe.",
    };
  }
  return {
    id: "manual",
    label: "Manual bank settlement",
    connected: false,
    notice:
      "No card provider is connected yet, so this payment is recorded and confirmed manually by the Insight team.",
  };
}
