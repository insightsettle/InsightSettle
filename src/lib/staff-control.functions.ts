import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { auctionSettingsSchema } from './auction-fees';
const reason=z.string().trim().min(3).max(2000);
async function staff(context: {supabase:any;userId:string}, need: boolean|'support'|'finance'=false) {
 const {requireStaffAccess}=await import('./staff-auth.server');
 return await requireStaffAccess(context, need===true?'admin':need===false?'read':need) as any;
}
async function checked(p:PromiseLike<any>){const r=await p;if(r.error)throw r.error;return r.data;}
async function audit(db:any,actor:string,action:string,entity:string,id:string,old:any,value:any,why:string){await checked(db.rpc('staff_control_audit',{_actor:actor,_action:action,_entity:entity,_id:id,_old:old,_new:value,_reason:why}));}
export const readAuctionSettings=createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const db=await staff(context,true);return auctionSettingsSchema.parse(await checked(db.from('auction_fee_settings').select('*').eq('id',true).single()));
});
export const saveAuctionSettings=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(i=>z.object({settings:auctionSettingsSchema,reason}).parse(i)).handler(async({context,data})=>{
 const db=await staff(context,true);await checked(db.rpc('staff_save_auction_settings',{_actor:context.userId,_settings:data.settings,_reason:data.reason}));return {ok:true};
});
export const listStaffLots=createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const db=await staff(context);return await checked(db.from('auction_lots').select('id,title,owner_pct,organiser_pct,status,funded_deal_id,auctions(title,currency)').order('id').limit(100)) as any[];
});
export const editStaffLotSplit=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(i=>z.object({lotId:z.string().uuid(),organiser:z.number().min(0).max(100),reason}).parse(i)).handler(async({context,data})=>{
 const db=await staff(context, 'finance');await checked(db.rpc('staff_edit_auction_split',{_actor:context.userId,_lot:data.lotId,_organiser:data.organiser,_reason:data.reason}));return {ok:true};
});
export const customer360=createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).inputValidator(i=>z.object({userId:z.string().uuid()}).parse(i)).handler(async({context,data})=>{
 const db=await staff(context);const u=await db.auth.admin.getUserById(data.userId);if(u.error||!u.data.user)throw new Error('User not found');
 const [profile,payout,business,documents,deals,notifications,notes]=await Promise.all([
 checked(db.from('profiles').select('*').eq('id',data.userId).maybeSingle()),
 checked(db.from('payout_accounts').select('*').eq('user_id',data.userId).maybeSingle()),
 checked(db.from('business_profiles').select('*').eq('user_id',data.userId).maybeSingle()),
 checked(db.from('kyc_documents').select('id,doc_type,status,review_note,created_at').eq('user_id',data.userId)),
 checked(db.from('deals').select('id,ref,title,status,amount,currency,deal_type,buyer_id,seller_id').or(`buyer_id.eq.${data.userId},seller_id.eq.${data.userId},created_by.eq.${data.userId}`).order('created_at',{ascending:false})),
 checked(db.from('notifications').select('id,title,body,kind,created_at,read_at').eq('user_id',data.userId).order('created_at',{ascending:false}).limit(100)),
 checked(db.from('audit_logs').select('id,new_value,created_at').eq('entity','profiles').eq('entity_id',data.userId).eq('action','INTERNAL_NOTE').order('created_at',{ascending:false}).limit(100)),
 ]);
 const ids=(deals??[]).map((d:any)=>d.id);
 const [payments,invoices,disputes]=ids.length?await Promise.all([
 checked(db.from('deal_transactions').select('id,deal_id,kind,amount,fee,currency,status,provider_ref,created_at').in('deal_id',ids)),
 checked(db.from('tax_invoices').select('id,deal_id,invoice_number,fee,vat,total,currency,issued_at').in('deal_id',ids)),
 checked(db.from('disputes').select('id,deal_id,reason,status,outcome,created_at').in('deal_id',ids)),
 ]):[[],[],[]];
 return {user:{id:u.data.user.id,email:u.data.user.email??'',phone:u.data.user.phone??'',lastSignIn:u.data.user.last_sign_in_at??null,emailConfirmed:!!u.data.user.email_confirmed_at},profile,payout,business,documents,deals,notifications,notes,payments,invoices,disputes} as {user:{id:string;email:string;phone:string;lastSignIn:string|null;emailConfirmed:boolean};profile:any;payout:any;business:any;documents:any[];deals:any[];notifications:any[];notes:any[];payments:any[];invoices:any[];disputes:any[]};
});
export const customerIntervention=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(i=>z.object({userId:z.string().uuid(),action:z.enum(['reset','verify_email','email','phone','suspend','reactivate','note']),value:z.string().trim().max(2000).default(''),reason}).parse(i)).handler(async({context,data})=>{
 const db=await staff(context, 'support');const r=await db.auth.admin.getUserById(data.userId);const u=r.data.user;if(r.error||!u)throw new Error('User not found');
 if(data.action==='suspend'||data.action==='reactivate'){await checked(db.rpc('staff_account_state',{_actor:context.userId,_user:data.userId,_state:data.action==='suspend'?'suspended':'active',_reason:data.reason}));return {ok:true,message:'Account state updated'};}
 if(data.action==='note'){if(data.value.length<3)throw new Error('Note is required');await audit(db,context.userId,'INTERNAL_NOTE','profiles',data.userId,null,{internal_note:data.value},data.reason);return {ok:true,message:'Internal note saved'};}
 if(data.action==='email'){
  const email=z.string().email().parse(data.value);
  await audit(db,context.userId,'EMAIL_CHANGE_REQUEST','profiles',data.userId,{email:u.email},{email,status:'requested'},data.reason);
  const updated=await db.auth.admin.updateUserById(data.userId,{email});if(updated.error)throw updated.error;
  await audit(db,context.userId,'EMAIL_CHANGED','profiles',data.userId,{email:u.email},{email},data.reason);
  return {ok:true,message:'Email updated'};
 }
 if(data.action==='phone'){
  const phone=data.value ? z.string().regex(/^\+?[0-9 ()-]{7,30}$/).parse(data.value) : null;const p=await checked(db.from('profiles').select('phone').eq('id',data.userId).single());
  await audit(db,context.userId,'PHONE_CHANGE_REQUEST','profiles',data.userId,{phone:p.phone},{phone},data.reason);
  await checked(db.from('profiles').update({phone}).eq('id',data.userId));await audit(db,context.userId,'PHONE_CHANGED','profiles',data.userId,{phone:p.phone},{phone},data.reason);return {ok:true,message:'Phone updated'};
 }
 if(!u.email)throw new Error('No email on account');
 if(data.action==='verify_email'&&u.email_confirmed_at)throw new Error('Email is already verified');
 await audit(db,context.userId,data.action==='reset'?'PASSWORD_RESET_REQUEST':'VERIFICATION_RESEND_REQUEST','profiles',data.userId,null,{email:u.email},data.reason);
 const result=data.action==='reset'?await db.auth.resetPasswordForEmail(u.email,{redirectTo:'https://insightsettle.com/auth/reset'}):await db.auth.resend({type:'signup',email:u.email,options:{emailRedirectTo:'https://insightsettle.com/auth/confirmed'}});
 if(result.error)throw result.error;
 return {ok:true,message:'Email request accepted; delivery is not confirmed'};
});
export const dealIntervention=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(i=>z.object({dealId:z.string().uuid(),action:z.enum(['payment','delivery','inspection','freeze','unfreeze','email','note','invite','notification']),value:z.string().trim().max(2000).default(''),reason}).parse(i)).handler(async({context,data})=>{
 const db=await staff(context, 'support');
 if(data.action==='email')z.string().email().parse(data.value);
 if(['payment','delivery','inspection'].includes(data.action))z.string().datetime().parse(data.value);
 if(data.action==='note'&&data.value.length<3)throw new Error('Note is required');
 if(data.action==='invite'||data.action==='notification'){
  const d=await checked(db.from('deals').select('id,ref,title,deal_type,status,buyer_id,seller_id,counterparty_email,invite_token,payment_deadline_at').eq('id',data.dealId).single());
  await audit(db,context.userId,data.action==='invite'?'INVITATION_RESEND_REQUEST':'NOTIFICATION_RESEND_REQUEST','deals',data.dealId,null,{channel:data.action==='invite'?'email':'in_app'},data.reason);
  if(data.action==='notification'){
   const n=await checked(db.from('notifications').select('user_id,title,body,kind').eq('deal_id',data.dealId).order('created_at',{ascending:false}).limit(1).maybeSingle());if(!n)throw new Error('No notification to resend');
   const {notifyUsers}=await import('./notify.server');await notifyUsers(db,{dealId:data.dealId,title:n.title,body:n.body,kind:n.kind,recipients:[n.user_id]});return {ok:true,message:'In-app notification resent'};
  }
  if(!d.counterparty_email||d.status!=='pending_funding'||(d.buyer_id&&d.seller_id&&d.deal_type!=='auction'))throw new Error('No pending invitation');
  if(d.payment_deadline_at&&Date.parse(d.payment_deadline_at)<=Date.now())throw new Error('Offer ended');
  const {sendTemplateEmail}=await import('./email-templates/send-email');
  const result=await sendTemplateEmail('deal-invitation',d.counterparty_email,{templateData:{title:d.title,link:`https://insightsettle.com/invite/${d.invite_token}`}});
  return {ok:result.sent,message:result.sent?'Email request accepted; delivery is not confirmed':'Recipient suppressed; email not sent'};
 }
 await checked(db.rpc('staff_operational_update',{_actor:context.userId,_deal:data.dealId,_action:data.action,_value:data.value,_reason:data.reason}));return {ok:true,message:'Change saved'};
});
export type StaffSearchResult={kind:'user'|'deal';id:string;label:string;detail:string};
export const consoleSearch=createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).inputValidator(i=>z.object({query:z.string().trim().min(2).max(120)}).parse(i)).handler(async({context,data}):Promise<StaffSearchResult[]>=>{
 const db=await staff(context);const q=data.query.replace(/[%_(),]/g,'');if(q.length<2)return [];
 const [profiles,deals,invoices,transactions]=await Promise.all([
 checked(db.from('profiles').select('id,full_name,phone').or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`).limit(10)),
 checked(db.from('deals').select('id,ref,title').ilike('ref',`%${q}%`).limit(10)),
 checked(db.from('tax_invoices').select('deal_id,invoice_number').ilike('invoice_number',`%${q}%`).limit(10)),
 checked(db.from('deal_transactions').select('deal_id,provider_ref').ilike('provider_ref',`%${q}%`).limit(10)),
 ]);
 const users:StaffSearchResult[]=(profiles??[]).map((p:any)=>({kind:'user',id:p.id,label:p.full_name||p.phone||p.id,detail:p.phone??''}));
 if(q.includes('@')){const matches=await checked(db.rpc('staff_search_email',{_actor:context.userId,_query:q}));for(const u of matches??[])users.push({kind:'user',id:u.id,label:u.email,detail:''});}
 const related=[...(invoices??[]).map((r:any)=>({id:r.deal_id,label:r.invoice_number})),...(transactions??[]).map((r:any)=>({id:r.deal_id,label:r.provider_ref}))];
 return [...users,...(deals??[]).map((d:any)=>({kind:'deal' as const,id:d.id,label:d.ref,detail:d.title})),...related.map((d:any)=>({kind:'deal' as const,id:d.id,label:d.label,detail:''}))].filter((r,i,a)=>a.findIndex(v=>v.kind===r.kind&&v.id===r.id)===i).slice(0,20);
});
