import { add } from './money';
export function summarize(rows: { currency:string;kind:string;status:string;amount:string }[]) {
  return [...new Set(rows.map(t=>t.currency))].map(currency=>{
    const group=rows.filter(t=>t.currency===currency);
    const total=(kind:string)=>add(group.filter(t=>t.status==='succeeded'&&t.kind===kind).map(t=>t.amount),currency);
    return {currency,transaction_count:group.length,successful_count:group.filter(t=>t.status==='succeeded').length,captured:total('funding'),refunded:total('refund'),payouts:total('release'),pending:add(group.filter(t=>['pending','processing'].includes(t.status)).map(t=>t.amount),currency),failed:add(group.filter(t=>t.status==='failed').map(t=>t.amount),currency)};
  });
}