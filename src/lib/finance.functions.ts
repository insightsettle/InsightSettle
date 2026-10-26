import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { providers, simulatedAdapter } from './finance/providers';
import { parseStatement, reconcile } from './finance/reconciliation';
import { simulateRouting } from './finance/routing';
import { summarize } from './finance/summary';
const reason = z.string().trim().min(3).max(2000);
const currency = z.enum(['SAR','BHD','KWD','OMR','AED','QAR','USD']);
const amount = z.string().regex(/^\d+(\.\d{1,3})?$/).max(22);
const ruleSchema = z.object({ provider:z.enum(['manual','afs','tap','lite','geidea']), country:z.enum(['SA','BH','AE','KW','OM','QA']), currency, method:z.enum(['mada','credit_card','bank_transfer']), maxAmount:amount, enabled:z.boolean(), version:z.string().max(80) });
export type FinanceTransaction = { id:string; deal_id:string; deal_ref:string; buyer_id:string|null; seller_id:string|null; kind:string; amount:string; fee:string; currency:string; status:string; provider:string; provider_ref:string|null; created_at:string; updated_at:string; operational_status:string; environment:string; fx_quote_id:string|null; milestone_id:string|null; payout_split_id:string|null };
export type FinanceRecord = { id:string;actor_id:string;kind:string;subject_id:string;payload:any;reason:string;created_at:string };
async function checked(query: PromiseLike<any>) { const r = await query; if (r.error) throw new Error(r.error.message); return r.data; }
async function staff(context:any, capability:'read'|'finance'|'admin'='read') { const { requireStaffAccess } = await import('./staff-auth.server'); return requireStaffAccess(context,capability); }
async function append(db:any, context:any, kind:string, subject:string, payload:any, why:string, key:string) {
  return checked(db.rpc('finance_append_record',{_actor:context.userId,_kind:kind,_subject:subject,_payload:payload,_reason:why,_key:key}));
}
export const financeList = createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).inputValidator(i=>z.object({query:z.string().max(100).default(''),currency:z.string().default(''),provider:z.string().default(''),status:z.string().default(''),from:z.string().datetime(),to:z.string().datetime(),page:z.number().int().min(0).default(0)}).parse(i)).handler(async({context,data})=>{
  const db=await staff(context); let q=db.from('finance_transactions').select('*',{count:'exact'}).gte('created_at',data.from).lt('created_at',data.to).order('created_at',{ascending:false});
  if(data.currency)q=q.eq('currency',data.currency);if(data.provider)q=q.eq('provider',data.provider);if(data.status)q=q.eq('status',data.status);
  const search=data.query.replace(/[^a-zA-Z0-9-]/g,'');if(search)q=q.or(`deal_ref.ilike.%${search}%,provider_ref.ilike.%${search}%`);
  const r=await q.range(data.page*50,data.page*50+49);if(r.error)throw new Error(r.error.message);
  const records=await checked(db.from('finance_records').select('*').order('created_at',{ascending:false}).limit(200));
  const summary=summarize(r.data as FinanceTransaction[]);
  return {transactions:r.data as FinanceTransaction[],count:r.count??0,records:records as FinanceRecord[],summary,providers,actorId:context.userId};
});
export const financeDetail = createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).inputValidator(i=>z.object({id:z.string().uuid()}).parse(i)).handler(async({context,data})=>{
  const db=await staff(context);const t=await checked(db.from('finance_transactions').select('*').eq('id',data.id).single()) as FinanceTransaction;
  const [events,ledger,invoices,history,audit,disputes]=await Promise.all([
    checked(db.from('deal_events').select('id,title,note,created_at').eq('deal_id',t.deal_id).order('created_at')),
    checked(db.from('ledger_entries').select('id,account,debit,credit,currency,reference,created_at').eq('deal_id',t.deal_id).order('created_at')),
    checked(db.from('tax_invoices').select('id,invoice_number,fee,vat,total,currency,issued_at').eq('deal_id',t.deal_id)),
    checked(db.from('finance_transactions').select('*').eq('deal_id',t.deal_id).order('created_at')),
    checked(db.from('audit_logs').select('id,action,created_at').eq('entity_id',t.deal_id).order('created_at').limit(100)),
    checked(db.from('disputes').select('id,status,reason,outcome,response_deadline,evidence_deadline,resolution_deadline').eq('deal_id',t.deal_id)),
  ]);
  return {transaction:t,events:events as any[],ledger:ledger as any[],invoices:invoices as any[],history:history as FinanceTransaction[],audit:audit as any[],disputes:disputes as any[],providerStatus:t.provider==='manual'?await simulatedAdapter.retrieveStatus(t):null};
});
export const financeProposal = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(i=>z.object({kind:z.enum(['provider_proposal','routing_proposal']),provider:z.enum(['manual','afs','tap','lite','geidea']),enabled:z.boolean(),rule:ruleSchema.optional(),reason,key:z.string().uuid()}).parse(i)).handler(async({context,data})=>{
  const db=await staff(context,'admin');
  if(data.kind==='routing_proposal'&&!data.rule)throw new Error('Routing rule required');
  const id=await append(db,context,data.kind,data.provider,{environment:'sandbox',live:false,provider:data.provider,enabled:data.enabled,...(data.rule?{rule:data.rule}:{})},data.reason,data.key);
  return {id:String(id)};
});
export const financeApprove = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(i=>z.object({id:z.string().uuid(),reason,key:z.string().uuid()}).parse(i)).handler(async({context,data})=>{
  const db=await staff(context,'admin');return {id:String(await append(db,context,'approval',data.id,{environment:'sandbox'},data.reason,data.key))};
});
export const financeSimulate = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(i=>z.object({rule:ruleSchema,amount,country:z.enum(['SA','BH','AE','KW','OM','QA']),currency,method:z.enum(['mada','credit_card','bank_transfer']),previousOutcome:z.enum(['none','failed_safe','unknown','succeeded']),reason,key:z.string().uuid()}).parse(i)).handler(async({context,data})=>{
  const db=await staff(context,'finance');const result=simulateRouting(data.rule,data);
  await append(db,context,'routing_simulation',data.rule.version,{input:data,rule:data.rule,result},data.reason,data.key);return result;
});
export const financeImport = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(i=>z.object({csv:z.string().max(100000),filename:z.string().max(120),reason,key:z.string().uuid()}).parse(i)).handler(async({context,data})=>{
  const db=await staff(context,'finance');const rows=parseStatement(data.csv);if(!rows.length)throw new Error('Statement is empty');
  const refs=[...new Set(rows.map(r=>r.provider_ref))];const transactions=await checked(db.from('finance_transactions').select('id,provider_ref,amount,currency,kind,status').in('provider_ref',refs));
  const results=reconcile(rows,transactions);
  const id=await append(db,context,'reconciliation_import',data.filename,{environment:'sandbox',source:'uploaded_unverified',originalCsv:data.csv,results},data.reason,data.key);
  return {id:String(id),results};
});
export const financeResolve = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(i=>z.object({importId:z.string().uuid(),row:z.number().int().min(0).max(199),evidence:z.string().trim().min(3).max(300),reason,key:z.string().uuid()}).parse(i)).handler(async({context,data})=>{
  const db=await staff(context,'finance');const record=await checked(db.from('finance_records').select('*').eq('id',data.importId).eq('kind','reconciliation_import').single());
  const result=(record.payload as any)?.results?.[data.row];if(!result||result.outcome==='matched')throw new Error('Unresolved exception required');
  return {id:String(await append(db,context,'reconciliation_resolution',`${data.importId}:${data.row}`,{evidence:data.evidence,environment:'sandbox',outcome:'manually_reviewed_not_provider_confirmation'},data.reason,data.key))};
});
export const financeExport = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(i=>z.object({from:z.string().datetime(),to:z.string().datetime(),reason,key:z.string().uuid()}).parse(i)).handler(async({context,data})=>{
  const db=await staff(context,'finance');const rows=await checked(db.from('finance_transactions').select('*').gte('created_at',data.from).lt('created_at',data.to).order('created_at').limit(5001));
  if(rows.length>5000)throw new Error('Narrow the period to at most 5000 transactions');
  await append(db,context,'export','transactions',{environment:'sandbox',from:data.from,to:data.to,count:rows.length},data.reason,data.key);return rows as FinanceTransaction[];
});
export const financeQueue = createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  const db=await staff(context);return checked(db.from('disputes').select('id,deal_id,reason,status,outcome,created_at,response_deadline,evidence_deadline,resolution_deadline,deals(ref,currency)').order('created_at',{ascending:false}).limit(100)) as Promise<any[]>;
});