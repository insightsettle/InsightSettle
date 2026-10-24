import { expect, it } from 'vitest';
import { auctionFee, auctionSettingsSchema, type AuctionFeeSettings } from './auction-fees';
import { dealFee, BANDED_SCHEDULE_V03 as PROVISIONAL_SCHEDULE, splitFee } from './fees';
const base: AuctionFeeSettings = { mode:'standard',percent:1,min_usd:2,max_usd:10,fixed_usd:3,default_commission:15,max_commission:30 };
it('standard auction and non-auction USD 10,000 fees remain 197.50',()=>{
 expect(auctionFee(10000,'USD',1,PROVISIONAL_SCHEDULE,base)).toBe(197.50);
 expect(dealFee(10000,'USD',1,PROVISIONAL_SCHEDULE)).toBe(197.50);
 auctionFee(10000,'USD',1,PROVISIONAL_SCHEDULE,{...base,mode:'fixed'});
 expect(dealFee(10000,'USD',1,PROVISIONAL_SCHEDULE)).toBe(197.50);
});
it('percentage enforces USD minimum and cap',()=>{
 expect(auctionFee(100,'USD',1,PROVISIONAL_SCHEDULE,{...base,mode:'percentage'})).toBe(2);
 expect(auctionFee(500,'USD',1,PROVISIONAL_SCHEDULE,{...base,mode:'percentage'})).toBe(5);
 expect(auctionFee(2000,'USD',1,PROVISIONAL_SCHEDULE,{...base,mode:'percentage'})).toBe(10);
});
it('fixed USD fee converts and rounds SAR to two decimals',()=>expect(auctionFee(48000,'SAR',1/3.75,PROVISIONAL_SCHEDULE,{...base,mode:'fixed',fixed_usd:1.01})).toBe(3.79));
it('fixed USD fee rounds BHD to three decimals',()=>expect(auctionFee(1000,'BHD',1/0.376,PROVISIONAL_SCHEDULE,{...base,mode:'fixed',fixed_usd:1.01})).toBe(0.380));
it('percentage rounds KWD to three decimals',()=>expect(auctionFee(1000.5,'KWD',3.25,PROVISIONAL_SCHEDULE,{...base,mode:'percentage',max_usd:null,percent:0.123})).toBe(1.231));
it('VAT is applied only to winner fee, unchanged',()=>{
 const fee=auctionFee(48000,'SAR',1/3.75,PROVISIONAL_SCHEDULE,{...base,mode:'fixed',fixed_usd:4});
 const b=splitFee({amount:48000,currency:'SAR',fee,feePayer:'buyer',buyerCountry:'SA',supplierCountry:'SA'});
 expect(b.buyerShare).toBe(15); expect(b.buyerVat).toBe(2.25);expect(b.sellerShare).toBe(0);expect(b.sellerVat).toBe(0);expect(b.buyerTotal).toBe(48017.25);
});
it('commission maximum and USD bounds are validated',()=>{
 expect(auctionSettingsSchema.safeParse({...base,default_commission:31}).success).toBe(false);
 expect(auctionSettingsSchema.safeParse({...base,min_usd:11}).success).toBe(false);
});
