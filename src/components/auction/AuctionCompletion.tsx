import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { Truck, CheckCircle2 } from 'lucide-react';
import { updateShipping, confirmDelivery } from '@/lib/deal-party.functions';
import { requestFundsRelease } from '@/lib/payments.functions';
import { auctionCompletionState } from '@/lib/auction-completion';
import { useLocale } from '@/lib/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuctionClock } from './AuctionShared';

export function AuctionCompletion({ deal, buyer, organiser }: { deal: { id: string; status: string; frozen?: boolean; auto_release_at?: string | null; shipping_tracking?: string | null }; buyer: boolean; organiser: boolean }) {
  const { text } = useLocale(); const qc = useQueryClient(); const now = useAuctionClock();
  const ship = useServerFn(updateShipping); const deliver = useServerFn(confirmDelivery); const release = useServerFn(requestFundsRelease);
  const [tracking, setTracking] = useState(''); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState('');
  const state = auctionCompletionState(deal, buyer, organiser, now);
  async function action(kind: 'ship' | 'deliver' | 'accept') {
    setBusy(true); setNotice('');
    try {
      if (kind === 'ship') await ship({ data: { dealId: deal.id, carrier: '', tracking: tracking.trim(), status: 'shipped' } });
      else if (kind === 'deliver') await deliver({ data: { dealId: deal.id } });
      else { const result = await release({ data: { dealId: deal.id } }); if (!result.ok) throw new Error(result.message); }
      await Promise.all(['auction-deal-view','auction-summaries','auction','deal'].map(key => qc.invalidateQueries({ queryKey: [key] })));
      setNotice(text('Recorded.', 'تم التسجيل.'));
    } catch { setNotice(text('Action failed. Refresh and check the lot status.', 'تعذّر تنفيذ الإجراء. حدّث الصفحة وتحقق من حالة القطعة.')); }
    finally { setBusy(false); }
  }
  if (!state.ship && !state.accept) return null;
  return <section className="space-y-4 border-y py-5" data-no-localize>
    {state.ship && <><Label htmlFor={`tracking-${deal.id}`}>{text('Tracking reference','رقم التتبع')}</Label><Input id={`tracking-${deal.id}`} value={tracking} onChange={e => setTracking(e.target.value)} /><div className="flex flex-wrap gap-2"><Button disabled={busy || !tracking.trim()} onClick={() => action('ship')}><Truck />{text('Mark shipped','تأكيد الشحن')}</Button>{state.deliver && <Button variant="outline" disabled={busy} onClick={() => action('deliver')}><CheckCircle2 />{text('Confirm delivery','تأكيد التسليم')}</Button>}</div>{deal.shipping_tracking && <p className="text-sm text-muted-foreground"><bdi>{deal.shipping_tracking}</bdi></p>}</>}
    {state.accept && <Button className="h-auto min-h-10 whitespace-normal" disabled={busy} onClick={() => action('accept')}><CheckCircle2 />{text('Confirm receipt and accept','تأكيد الاستلام والقبول')}</Button>}
    {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
  </section>;
}