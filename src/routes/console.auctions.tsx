import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { getStaffAuctions } from '@/lib/staff.functions';
import { useLocale } from '@/lib/locale';
import { formatMoney } from '@/lib/money';
import { nextBidderAction } from '@/lib/auction-console-display';
import { AuctionCountdown, AuctionStatus } from '@/components/auction/AuctionShared';
import { LiveDisputes } from '@/components/site/StaffOps';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

export const Route = createFileRoute('/console/auctions')({
  head:()=>({meta:[{title:'Auction operations | Insight staff console'},{name:'description',content:'Read-only auction organisers, lots, non-payment offers and auction disputes.'},{property:'og:title',content:'Auction operations | Insight'},{property:'og:description',content:'Review auction deadlines, direct payout shares and authenticity disputes.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'},{name:'robots',content:'noindex'}]}),
  component: ConsoleAuctions,
});
function ConsoleAuctions() {
  const {text,locale}=useLocale();const fn=useServerFn(getStaffAuctions);
  const q=useQuery({queryKey:['staff-auctions'],queryFn:()=>fn(),refetchInterval:15000});
  const [tab,setTab]=useState('lots');const d=q.data;
  const name=(id:string)=>d?.profiles.find(p=>p.id===id)?.full_name??'—';
  const date=(s:string|null)=>s?new Date(s).toLocaleString(locale==='ar'?'ar-SA':'en-GB'):'—';
  const header=(labels:string[]) => <thead className="bg-muted text-muted-foreground"><tr>{labels.map(l=><th className="p-4 text-start font-medium" key={l}>{l}</th>)}</tr></thead>;
  return <TooltipProvider><div className="mt-6 space-y-5" data-no-localize>
    <h2 className="text-xl font-semibold">{text('Auctions','المزادات')}</h2>
    <div role="tablist" className="flex flex-wrap gap-2">{[['organisers','Organisers','المنظّمون'],['lots','Lots','القطع'],['nonpayers','Non-payers queue','قائمة غير المسددين'],['disputes','Authenticity disputes','نزاعات الأصالة']].map(([key,en,ar])=><Button key={key} role="tab" aria-selected={tab===key} variant={tab===key?'secondary':'ghost'} onClick={()=>setTab(key??'lots')}>{text(en??'',ar)}</Button>)}</div>
    {q.isPending&&<p>{text('Loading…','جارٍ التحميل…')}</p>}
    {q.isError&&<p role="alert" className="text-destructive">{text('Auction records unavailable','تعذّر تحميل سجلات المزادات')}</p>}
    {tab==='disputes'?<LiveDisputes auctionOnly/>:d&&<div className="overflow-x-auto rounded-lg border border-border"><table className="w-full min-w-[750px] text-sm">
      {tab==='organisers'&&<>{header([text('Name','الاسم'),text('Verification status','حالة التحقق'),text('Payout account on file','حساب صرف مسجل'),text('Auctions','المزادات'),text('Lots','القطع')])}<tbody>{[...new Set<string>(d.auctions.map(a=>a.organiser_id))].map(id=>{const auctions=d.auctions.filter(a=>a.organiser_id===id);return <tr key={id} className="border-t even:bg-muted/40"><td className="p-4">{name(id)}</td><td className="p-4">{text(d.profiles.find(p=>p.id===id)?.verification_status??'—')}</td><td className="p-4">{d.payouts.some(p=>p.user_id===id)?text('Yes','نعم'):text('No','لا')}</td><td className="p-4 tabular-nums">{auctions.length}</td><td className="p-4 tabular-nums">{d.lots.filter(l=>auctions.some(a=>a.id===l.auction_id)).length}</td></tr>})}</tbody></>}
      {tab==='lots'&&<>{header([text('Lot / auction','القطعة / المزاد'),text('Owner','المالك'),text('Hammer price','سعر المطرقة'),text('Owner / organiser split','تقسيم المالك / المنظّم'),text('Status','الحالة'),text('Current rank','الترتيب الحالي'),text('Payment deadline','مهلة الدفع'),text('Deal','الصفقة')])}<tbody>{d.lots.map(l=>{const a=d.auctions.find(a=>a.id===l.auction_id);const b=d.bidders.find(b=>b.lot_id===l.id&&['offered','paid'].includes(b.status));const deal=d.deals.find(x=>x.id===(l.funded_deal_id??l.deal_id));return <tr key={l.id} className="border-t even:bg-muted/40"><td className="p-4"><Tooltip><TooltipTrigger asChild><span tabIndex={0} className="cursor-help">{l.title} · {l.id.slice(0,8)}</span></TooltipTrigger><TooltipContent>{text('Fee: standard table, paid by winner','الرسوم: الجدول القياسي، يدفعها الفائز')}</TooltipContent></Tooltip><p className="mt-1 text-xs text-muted-foreground">{a?.title}</p></td><td className="p-4">{name(l.owner_id)}</td><td className="p-4 tabular-nums"><bdi>{deal?formatMoney(Number(deal.amount),deal.currency):'—'}</bdi></td><td className="p-4 tabular-nums"><bdi>{l.owner_pct}% / {l.organiser_pct}%</bdi></td><td className="p-4"><AuctionStatus status={deal?.status??l.status}/></td><td className="p-4 tabular-nums">{b?.rank??'—'}</td><td className="p-4">{b?.status==='offered'?<><AuctionCountdown deadline={b.deadline_at}/><p className="text-xs text-muted-foreground">{date(b.deadline_at)}</p></>:'—'}</td><td className="p-4">{deal?<Link className="text-primary" to="/console/deals/$dealId" params={{dealId:deal.ref}}>{deal.ref}</Link>:'—'}</td></tr>})}</tbody></>}
      {tab==='nonpayers'&&<>{header([text('Bidder','المزايد'),text('Rank','الترتيب'),text('Lot','القطعة'),text('Status','الحالة'),text('Time','الوقت'),text('Next action','الإجراء التالي')])}<tbody>{d.bidders.filter(b=>['expired','declined'].includes(b.status)).map(b=>{const l=d.lots.find(l=>l.id===b.lot_id);const deal=d.deals.find(x=>x.id===b.deal_id);const next=nextBidderAction(b.rank,d.bidders.filter(x=>x.lot_id===b.lot_id),l?.status==='unsold');return <tr key={b.id} className="border-t even:bg-muted/40"><td className="p-4">{b.platform_handle}</td><td className="p-4">{b.rank}</td><td className="p-4">{l?.title}</td><td className="p-4"><AuctionStatus status={b.status}/></td><td className="p-4">{date(deal?.cancelled_at??b.deadline_at)}</td><td className="p-4">{next.kind==='offered'?`${text('Offered to rank','عُرضت على الترتيب')} ${next.rank}`:next.kind==='unsold'?text('Unsold','غير مباعة'):text('Not recorded','غير مسجل')}</td></tr>})}</tbody></>}
    </table></div>}
  </div></TooltipProvider>;
}