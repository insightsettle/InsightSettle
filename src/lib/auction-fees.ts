import { dealFee, type FeeSchedule } from '@/lib/fees';
import { roundMoney } from '@/lib/money';
import { z } from 'zod';
export const auctionSettingsSchema = z.object({
  mode: z.enum(['standard', 'percentage', 'fixed']), percent: z.number().min(0).max(100),
  min_usd: z.number().min(0), max_usd: z.number().min(0).nullable(), fixed_usd: z.number().min(0),
  default_commission: z.number().min(0).max(100), max_commission: z.number().min(0).max(100),
}).refine(v => v.max_usd == null || v.max_usd >= v.min_usd, 'Maximum must be at least the minimum.')
  .refine(v => v.default_commission <= v.max_commission, 'Default commission must not exceed the maximum.');
export type AuctionFeeSettings = z.infer<typeof auctionSettingsSchema>;
export function auctionFee(amount: number, currency: string, usdPerUnit: number, schedule: FeeSchedule, settings: AuctionFeeSettings) {
  if (settings.mode === 'standard') return dealFee(amount, currency, usdPerUnit, schedule);
  if (!(usdPerUnit > 0)) throw new Error('USD conversion is unavailable.');
  if (settings.mode === 'fixed') return roundMoney(settings.fixed_usd / usdPerUnit, currency);
  let usd = Math.max(amount * usdPerUnit * settings.percent / 100, settings.min_usd);
  if (settings.max_usd != null) usd = Math.min(usd, settings.max_usd);
  return roundMoney(usd / usdPerUnit, currency);
}
