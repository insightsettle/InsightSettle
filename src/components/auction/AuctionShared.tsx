import { useEffect, useState } from 'react';
import { useLocale } from '@/lib/locale';
import { countdown } from '@/lib/auction-client';
import { Card, CardContent } from '@/components/ui/card';
import { Clock3, ListOrdered, ShieldCheck, Truck } from '@/components/icons';
export function useAuctionClock() { const [now, setNow] = useState(0); useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []); return now; }
export function AuctionCountdown({ deadline }: { deadline?: string | null | undefined }) { const now = useAuctionClock(); return <bdi className="font-medium tabular-nums text-warning" dir="ltr">{countdown(deadline, now)}</bdi>; }
export function AuctionStatus({ status, backup = false }: { status: string; backup?: boolean }) {
  const { text } = useLocale();
  const labels: Record<string,[string,string]> = { draft:['Draft','مسودة'],open:['Open','مفتوحة'],offered:['Awaiting payment','بانتظار الدفع'],pending_funding:['Awaiting payment','بانتظار الدفع'],funded:['Paid','مدفوعة'],held:['Paid','مدفوعة'],paid:['Paid','مدفوعة'],delivered:['In inspection','قيد الفحص'],under_review:['In inspection','قيد الفحص'],disputed:['Disputed','متنازع عليها'],released:['Completed','مكتملة'],closed:['Completed','مكتملة'],expired:['Expired','انتهت المهلة'],declined:['Declined','مرفوضة'],waiting:['Waiting','بانتظار الدور'],unsold:['Unsold','غير مباعة'],cancelled:['Cancelled','ملغاة'],refunded:['Refunded','مستردة'] };
  const label=backup ? ['Moved to backup','انتقلت للاحتياطي'] : labels[status] ?? [status,status];
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${backup ? 'bg-gold-subtle text-gold-foreground' : ['held','paid','released','funded','closed'].includes(status) ? 'bg-accent text-primary' : ['offered','pending_funding','delivered','under_review'].includes(status) ? 'bg-warning-subtle text-warning' : 'bg-muted text-muted-foreground'}`}><span className="size-1.5 rounded-full bg-current"/>{text(label[0] ?? status,label[1] ?? status)}</span>;
}
export function AuctionRules() { const { text } = useLocale(); const tiles=[[Clock3,'24 h payment deadline','مهلة دفع 24 ساعة'],[ListOrdered,'2 backups in order · no skipping','مزايدان احتياطيان بالترتيب · دون تخطّي'],[ShieldCheck,'72 h inspection','فحص لمدة 72 ساعة'],[Truck,'Organiser ships with tracking','المنظّم يشحن مع رقم تتبّع']] as const;
  return <Card><CardContent className="p-5"><h2 className="mb-4 font-semibold">{text('Auction rules','قواعد المزاد')}</h2><div className="grid gap-4 sm:grid-cols-2">{tiles.map(([Icon,en,ar])=><div key={en} className="flex items-center gap-3 text-xs leading-6"><Icon className="size-5 shrink-0 text-primary"/>{text(en,ar)}</div>)}</div><p className="mt-5 border-t pt-4 text-xs leading-6 text-muted-foreground">{text("The winner pays Insight’s fee. The provider pays the owner and organiser directly into separate accounts.",'الفائز يدفع رسوم إنسايت. يدفع المزوّد مباشرةً لصاحب القطعة والمنظّم في حسابين منفصلين.')}</p></CardContent></Card>;
}
