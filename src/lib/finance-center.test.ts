import { describe,it,expect } from 'vitest';
import { minor,decimal,add } from './finance/money';
import { providers,requireCapability,liveFlags,simulatedAdapter } from './finance/providers';
import { simulateRouting } from './finance/routing';
import { parseStatement,reconcile } from './finance/reconciliation';
import { summarize } from './finance/summary';
import { getPaymentProvider } from './payment-provider.server';
const rule={provider:'manual',country:'SA',currency:'SAR',method:'mada',maxAmount:'48000.00',enabled:true,version:'v1'};
const input={country:'SA',currency:'SAR',method:'mada',amount:'48000.00',previousOutcome:'none' as const};
describe('Finance exact amounts',()=>{
 it.each(['BHD','KWD','OMR'])('%s uses three decimals',c=>{expect(minor('1000.500',c)).toBe(1000500n);expect(decimal(1000500n,c)).toBe('1000.500');});
 it('SAR uses two decimals and does not accept fractional minor units',()=>{expect(minor('48000.00','SAR')).toBe(4800000n);expect(()=>minor('0.001','SAR')).toThrow();});
 it('totals large decimal strings without floating point loss',()=>expect(add(['999999999999.99','0.01'],'SAR')).toBe('1000000000000.00'));
 it('never combines currencies or counts refunds as captured volume',()=>{const rows=summarize([{currency:'BHD',kind:'funding',status:'succeeded',amount:'1000.500'},{currency:'SAR',kind:'refund',status:'succeeded',amount:'700.00'}]);expect(rows.find(r=>r.currency==='BHD')?.captured).toBe('1000.500');expect(rows.find(r=>r.currency==='SAR')?.captured).toBe('0.00');expect(rows.find(r=>r.currency==='SAR')?.refunded).toBe('700.00');});
});
describe('Provider contracts and gates',()=>{
 it('only simulation works and all live gates default off',()=>{expect(Object.values(liveFlags)).toEqual([false,false,false,false]);expect(getPaymentProvider().connected).toBe(false);expect(getPaymentProvider().id).toBe('manual');});
 it.each(['afs','tap','lite','geidea'])('%s candidate cannot execute checkout or payout',p=>{expect(()=>requireCapability(p,'checkout','sandbox')).toThrow();expect(()=>requireCapability(p,'payout','sandbox')).toThrow();});
 it('Tap country currency and bank-transfer restriction matches support statement',()=>{const p=providers.find(p=>p.id==='tap');expect(p?.countries).toEqual(['SA']);expect(p?.currencies).toEqual(['SAR']);expect(p?.methods.includes('bank_transfer')).toBe(false);});
 it('AFS capabilities remain unverified and escrow pending approval',()=>{const p=providers.find(p=>p.id==='afs');expect(p?.capabilities.payout).toBe('unverified');expect(p?.capabilities.escrow).toBe('pending_approval');});
 it('live and unimplemented capture are blocked',()=>{expect(()=>requireCapability('manual','checkout','production')).toThrow();expect(()=>requireCapability('manual','capture','sandbox')).toThrow();});
 it('status adapter never claims provider-authoritative evidence',async()=>expect(await simulatedAdapter.retrieveStatus({provider:'manual',status:'succeeded'})).toEqual({status:'succeeded',authoritative:false,environment:'sandbox'}));
});
describe('Routing simulation',()=>{
 it('eligible boundary returns a version but does not execute a payment',()=>expect(simulateRouting(rule,input)).toMatchObject({eligible:true,version:'v1',executesPayment:false}));
 it.each(['unknown','succeeded'] as const)('previous %s never causes failover',previousOutcome=>expect(simulateRouting(rule,{...input,previousOutcome}).reasons).toContain('previous_outcome_blocks_retry'));
 it('confirmed safe failure may be simulated again',()=>expect(simulateRouting(rule,{...input,previousOutcome:'failed_safe'}).eligible).toBe(true));
 it('candidate outage, country, currency and amount limits block routing',()=>{expect(simulateRouting({...rule,provider:'afs'},input).eligible).toBe(false);expect(simulateRouting(rule,{...input,country:'BH'}).reasons).toContain('country_mismatch');expect(simulateRouting(rule,{...input,amount:'48000.01'}).reasons).toContain('amount_limit');expect(simulateRouting(rule,{...input,currency:'USD'}).reasons).toContain('currency_mismatch');});
});
describe('Reconciliation',()=>{
 const row={provider_ref:'SIM-1',amount:'1000.500',currency:'BHD',kind:'funding',fee:'',bank_reference:'FICTIONAL'};
 const tx={id:'t1',provider_ref:'SIM-1',amount:'1000.5',currency:'BHD',kind:'funding',status:'succeeded'};
 it('matches exact decimals without changing any source transaction',()=>{const before=JSON.stringify(tx);expect(reconcile([row],[tx])[0]?.outcome).toBe('matched');expect(JSON.stringify(tx)).toBe(before);});
 it('duplicate rows and duplicate references are exceptions',()=>{expect(reconcile([row,row],[tx])[1]?.outcome).toBe('duplicate');expect(reconcile([row],[tx,{...tx,id:'t2'}])[0]?.outcome).toBe('ambiguous');});
 it('partial amount, missing, currency and status mismatches remain exceptions',()=>{expect(reconcile([{...row,amount:'500'}],[tx])[0]?.outcome).toBe('amount_mismatch');expect(reconcile([row],[])[0]?.outcome).toBe('missing');expect(reconcile([{...row,currency:'SAR'}],[tx])[0]?.outcome).toBe('currency_mismatch');expect(reconcile([row],[{...tx,status:'processing'}])[0]?.outcome).toBe('status_mismatch');});
 it('controlled CSV preserves quoted references and rejects unknown columns or bad precision',()=>{expect(parseStatement('provider_ref,amount,currency,kind,fee,bank_reference\n"SIM,1",1000.500,BHD,funding,,FICTIONAL')[0]?.provider_ref).toBe('SIM,1');expect(()=>parseStatement('card_number,amount\n123,1')).toThrow();expect(()=>parseStatement('provider_ref,amount,currency,kind,fee,bank_reference\nSIM,0.001,SAR,funding,,')).toThrow();});
});