import { minorUnitsFor } from "@/lib/money";

/** Form convenience only; the existing server validates the resulting plan. */
export function equalMilestoneAmounts(total: number, count: number, currency: string): string[] {
  if (!Number.isFinite(total) || total <= 0 || count < 1) return [];
  const decimals = minorUnitsFor(currency);
  const scale = 10 ** decimals;
  const minorTotal = Math.round(total * scale);
  const each = Math.floor(minorTotal / count);
  return Array.from({ length: count }, (_, i) => {
    const minor = i === count - 1 ? minorTotal - each * (count - 1) : each;
    return minor === 0 ? "" : (minor / scale).toFixed(decimals);
  });
}

/** Omitted retention is represented by zero in the existing create-deal contract. */
export function retentionFormValues(enabled: boolean, percent: string, days: string) {
  return {
    retentionPercent: enabled ? Math.min(10, Math.max(0, Number(percent) || 0)) : 0,
    defectsLiabilityDays: enabled ? Math.min(365, Math.max(0, Math.round(Number(days) || 0))) : 0,
  };
}