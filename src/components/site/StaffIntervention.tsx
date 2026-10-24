import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useLocale } from '@/lib/locale';
import { customerIntervention, dealIntervention } from '@/lib/staff-control.functions';
const customerActions=[['reset','Send password reset','إرسال رابط استعادة كلمة المرور'],['verify_email','Resend email verification','إعادة إرسال تأكيد البريد'],['email','Update email','تعديل البريد'],['phone','Update phone','تعديل الهاتف'],['suspend','Suspend account','تعليق الحساب'],['reactivate','Reactivate account','إعادة تفعيل الحساب'],['note','Internal note','ملاحظة داخلية']];
const dealActions=[['payment','Extend payment deadline','تمديد مهلة الدفع'],['delivery','Extend delivery deadline','تمديد مهلة التسليم'],['inspection','Extend inspection deadline','تمديد مهلة الفحص'],['freeze','Freeze deal','تجميد الصفقة'],['unfreeze','Unfreeze deal','إلغاء تجميد الصفقة'],['email','Correct invitation email','تصحيح بريد الدعوة'],['invite','Resend invitation','إعادة إرسال الدعوة'],['notification','Resend last notification','إعادة إرسال آخر إشعار'],['note','Internal note','ملاحظة داخلية']];
export function StaffIntervention({kind,id}:{kind:'customer'|'deal';id:string}){
 const {text}=useLocale();const qc=useQueryClient();const customer=useServerFn(customerIntervention);const deal=useServerFn(dealIntervention);
 const [action,setAction]=useState(kind==='customer'?'note':'delivery');const [value,setValue]=useState('');const [reason,setReason]=useState('');const [message,setMessage]=useState('');
 const date=['payment','delivery','inspection'].includes(action);const needsValue=['email','phone','note'].includes(action)||date;
 const m=useMutation({mutationFn:async()=>{
  const v=date?new Date(value).toISOString():value;
  if(kind==='customer')return customer({data:{userId:id,action:action as 'note',value:v,reason}});
  return deal({data:{dealId:id,action:action as 'note',value:v,reason}});
 },onSuccess:r=>{setMessage(r.message);setValue('');setReason('');qc.invalidateQueries();}});
 return <section data-no-localize className="my-6 min-w-0 border-y py-5"><h3 className="text-lg font-semibold">{text('Staff interventions','إجراءات الموظفين')}</h3><form className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2" onSubmit={e=>{e.preventDefault();setMessage('');m.mutate();}}>
 <div className="min-w-0 space-y-2"><Label htmlFor={`action-${kind}`}>{text('Action','الإجراء')}</Label><select id={`action-${kind}`} value={action} onChange={e=>{setAction(e.target.value);setValue('');setMessage('');}} className="h-10 w-full min-w-0 rounded-md border border-input bg-card px-3 text-sm">{(kind==='customer'?customerActions:dealActions).map(([key,en,ar])=><option key={key} value={key}>{text(en??'',ar)}</option>)}</select></div>
 {needsValue&&<div className="min-w-0 space-y-2"><Label htmlFor={`value-${kind}`}>{text(date?'New deadline':action==='note'?'Staff-only note':action==='email'?'New email':'New phone',date?'الموعد الجديد':action==='note'?'ملاحظة للموظفين فقط':action==='email'?'البريد الجديد':'الهاتف الجديد')}</Label>{action==='note'?<Textarea id={`value-${kind}`} value={value} onChange={e=>setValue(e.target.value)} required minLength={3}/>:<Input id={`value-${kind}`} className="min-w-0 w-full" type={date?'datetime-local':action==='email'?'email':'tel'} value={value} onChange={e=>setValue(e.target.value)} required/>}</div>}
 <div className="space-y-2 sm:col-span-2"><Label htmlFor={`reason-${kind}`}>{text('Required reason — recorded in staff history','السبب مطلوب — يُسجّل في سجل الموظفين')}</Label><Textarea id={`reason-${kind}`} required minLength={3} maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)}/></div>
 <div className="sm:col-span-2"><Button disabled={m.isPending} type="submit">{text(m.isPending?'Saving…':'Apply action',m.isPending?'جارٍ التنفيذ…':'تنفيذ الإجراء')}</Button></div>
 {m.isError&&<p role="alert" className="break-words text-sm text-destructive sm:col-span-2">{m.error instanceof Error?m.error.message:text('Action refused','رُفض الإجراء')}</p>}{message&&<p role="status" className="text-sm text-primary sm:col-span-2">{text(message, message.includes('delivery')?'قُبل طلب البريد؛ لم يتم تأكيد وصوله':message.includes('suppressed')?'لم يُرسل البريد: المستلم محظور':'تم تنفيذ الإجراء')}</p>}
 </form></section>;
}
