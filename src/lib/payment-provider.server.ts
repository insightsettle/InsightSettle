export type PaymentProvider = {
  id: string;
  label: string;
  connected: boolean;
  /** Message shown to both parties while no live provider is connected. */
  notice: string;
};

/**
 * Sandbox is the only enabled adapter. Credential presence is not evidence of
 * an integration and must never activate live money operations.
 */
export function getPaymentProvider(): PaymentProvider {
  return {
    id: "manual",
    label: "Payment provider simulation",
    connected: false,
    notice:
      "Escrow demo. The payment provider is simulated and no real money moves. At launch, funds will be held by a licensed payment provider; Insight runs the deal rules and keeps the record.",
  };
}
