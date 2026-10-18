import { useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Calculator, RefreshCw } from "lucide-react";
import { publicPricing } from "@/lib/public-pricing.functions";
import { useLocale } from "@/lib/locale";
import { formatMoney, moneyInputStep, SUPPORTED_CURRENCIES } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FeePayer } from "@/lib/fees";

export const publicPricingOptions = queryOptions({ queryKey: ["public-pricing"], queryFn: () => publicPricing({ data: { amount: 10000, currency: "USD", payer: "split", buyerCountry: "SA", supplierCountry: "BH" } }), staleTime: 60000 });
const countries = [["SA", "Saudi Arabia", "السعودية"], ["BH", "Bahrain", "البحرين"], ["AE", "United Arab Emirates", "الإمارات"], ["KW", "Kuwait", "الكويت"], ["QA", "Qatar", "قطر"], ["OM", "Oman", "عُمان"]] as const;
type Country = typeof countries[number][0];

export function PublicPricing() {
  const { text } = useLocale();
  const { data: initial } = useSuspenseQuery(publicPricingOptions);
  const calculate = useServerFn(publicPricing);
  const [result, setResult] = useState(initial);
  const [amount, setAmount] = useState("10000");
  const [currency, setCurrency] = useState<typeof SUPPORTED_CURRENCIES[number]>("USD");
  const [payer, setPayer] = useState<FeePayer>("split");
  const [buyerCountry, setBuyerCountry] = useState<Country>("SA");
  const [supplierCountry, setSupplierCountry] = useState<Country>("BH");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [dirty, setDirty] = useState(false);
  const b = result.available && !dirty ? result.breakdown : null;
  const schedule = initial.available ? initial.schedule : null;
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(false);
    try { setResult(await calculate({ data: { amount: Number(amount), currency, payer, buyerCountry, supplierCountry } })); setDirty(false); }
    catch { setError(true); }
    finally { setBusy(false); }
  }
  function countrySelect(side: "buyer" | "supplier") {
    const label = side === "buyer" ? text("Payer's country", "دولة الدافع") : text("Payee's country", "دولة المستفيد");
    return <div className="space-y-2"><Label>{label}</Label><Select value={side === "buyer" ? buyerCountry : supplierCountry} onValueChange={(v: Country) => { side === "buyer" ? setBuyerCountry(v) : setSupplierCountry(v); setDirty(true); }}><SelectTrigger aria-label={label}><SelectValue /></SelectTrigger><SelectContent>{countries.map(([code, en, ar]) => <SelectItem key={code} value={code}>{text(en, ar)}</SelectItem>)}</SelectContent></Select></div>;
  }
  return <div data-no-localize className="grid items-start gap-8 lg:grid-cols-[1fr_440px]">
    <div>
      <h3 className="text-xl font-semibold">{text("Marginal USD fee bands", "شرائح الرسوم بالدولار")}</h3>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">{text("Each rate applies only to the amount within its band. VAT depends on each party's country.", "تُطبّق كل نسبة على المبلغ داخل شريحتها فقط. تعتمد ضريبة القيمة المضافة على بلد كل طرف.")}</p>
      <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card"><table className="w-full text-start text-sm"><thead className="bg-muted text-muted-foreground"><tr><th className="p-4 text-start">{text("Deal value (USD)", "قيمة الصفقة (USD)")}</th><th className="p-4 text-start">{text("Rate", "النسبة")}</th></tr></thead><tbody>{schedule ? schedule.bands.map((band) => <tr key={band.from} className="border-t border-border"><td className="p-4">{band.from === 0 ? text("Up to", "حتى") : band.to === null ? text("Above", "أكثر من") : ""} <bdi className="tabular-nums">{band.from === 0 ? band.to?.toLocaleString("en-GB") : band.to === null ? band.from.toLocaleString("en-GB") : `${band.from.toLocaleString("en-GB")} – ${band.to.toLocaleString("en-GB")}`}</bdi></td><td className="p-4"><bdi>{band.percent}%</bdi></td></tr>) : <tr><td colSpan={2} className="p-6 text-muted-foreground">{text("Live fee bands are currently unavailable for public viewing.", "شرائح الرسوم الحالية غير متاحة للعرض العام حالياً.")}</td></tr>}</tbody></table></div>
      <p className="mt-4 text-sm leading-7 text-muted-foreground">{text("Fees are provisional and may change before launch", "الرسوم مؤقتة وقد تتغير قبل الإطلاق")}{schedule && <> · {text("Minimum", "الحد الأدنى")} <bdi>{formatMoney(schedule.minFee, "USD")}</bdi> · {text("Maximum", "الحد الأعلى")} <bdi>{formatMoney(schedule.maxFee ?? 0, "USD")}</bdi> {text("per deal", "لكل صفقة")}</>}</p>
      <p className="mt-5 text-sm leading-7 text-muted-foreground">{text("In Bahrain and Saudi Arabia, funds at launch will be held by payment providers licensed by CBB and SAMA respectively. Insight runs the deal rules and keeps the record.", "عند الإطلاق تُحفظ الأموال في البحرين والسعودية لدى مزوّدي دفع مرخّصين من مصرف البحرين المركزي والبنك المركزي السعودي على التوالي. تدير إنسايت قواعد الصفقة وتحفظ سجلها.")}</p>
    </div>
    <Card><CardContent className="p-6"><form onSubmit={submit} className="space-y-5">
      <h3 className="flex items-center gap-2 text-lg font-semibold"><Calculator className="size-5 text-primary" />{text("Fee calculator", "حاسبة الرسوم")}</h3>
      <div className="grid grid-cols-[1fr_110px] gap-3"><div className="space-y-2"><Label htmlFor="public-amount">{text("Deal amount", "مبلغ الصفقة")}</Label><Input id="public-amount" type="number" min={moneyInputStep(currency)} max="1000000000" step={moneyInputStep(currency)} required value={amount} dir="ltr" onChange={(e) => { setAmount(e.target.value); setDirty(true); }} /></div><div className="space-y-2"><Label>{text("Currency", "العملة")}</Label><Select value={currency} onValueChange={(v: typeof currency) => { setCurrency(v); setDirty(true); }}><SelectTrigger aria-label={text("Currency", "العملة")}><SelectValue /></SelectTrigger><SelectContent>{SUPPORTED_CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div></div>
      <fieldset><legend className="mb-2 text-sm font-medium">{text("Who pays the fee?", "من يتحمل الرسوم؟")}</legend><div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">{([['split','Split','مناصفة'],['buyer','Payer','الدافع'],['seller','Payee','المستفيد']] as const).map(([key,en,ar]) => <Button key={key} type="button" variant={payer === key ? "default" : "ghost"} aria-pressed={payer === key} onClick={() => { setPayer(key); setDirty(true); }}>{text(en,ar)}</Button>)}</div></fieldset>
      <div className="grid grid-cols-2 gap-3">{countrySelect("buyer")}{countrySelect("supplier")}</div>
      <Button className="w-full" disabled={busy} type="submit"><RefreshCw className={busy ? "size-4 animate-spin" : "size-4"} />{text("Calculate fees", "احسب الرسوم")}</Button>
      {(error || !result.available) && <p role="status" className="rounded-lg bg-warning-subtle p-3 text-sm leading-6 text-foreground">{text("Live pricing is unavailable for public access. No estimated numbers are substituted.", "التسعير الحالي غير متاح للعامة. لا تُعرض أرقام تقديرية بدلاً منه.")}</p>}
      <dl className="divide-y divide-border border-t border-border">{[[text("Total fee","إجمالي الرسوم"),b?.fee],[text("Payer share","حصة الدافع"),b?.buyerShare],[text("Payee share","حصة المستفيد"),b?.sellerShare],[text("Payer VAT","ضريبة الدافع"),b?.buyerVat],[text("Payee VAT","ضريبة المستفيد"),b?.sellerVat],[text("Payee receives before its VAT","صافي المستفيد قبل ضريبته"),b ? b.amount-b.sellerShare : null]].map(([label,value],i) => <div key={String(label)} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><dt className="text-muted-foreground">{label}</dt><dd className="font-semibold tabular-nums"><bdi>{value == null ? "—" : ((i===3 && b?.buyerVatRate===0) || (i===4 && b?.sellerVatRate===0)) ? text("No VAT","لا توجد ضريبة") : formatMoney(Number(value),currency)}</bdi></dd></div>)}</dl>
      {dirty && <p className="text-xs text-muted-foreground">{text("Calculate to refresh your result.", "احسب لتحديث النتيجة.")}</p>}
    </form></CardContent></Card>
  </div>;
}