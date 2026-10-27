import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import QRCode from "qrcode";
import { BadgeCheck, Info, Wallet } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/lib/locale";
import { formatMoney } from "@/lib/money";
import { getMyCard } from "@/lib/member-card.functions";
import { PageSkeleton } from "@/components/motion/Motion";

export const Route = createFileRoute("/_authenticated/card")({
  head: () => ({ meta: [{ title: "My Insight card | Insight" }, { name: "description", content: "Your Insight member card and the amounts in your deals." }] }),
  component: CardPage,
});

function CardPage() {
  const { text } = useLocale();
  const getFn = useServerFn(getMyCard);
  const card = useQuery({ queryKey: ["my-card"], queryFn: () => getFn() });
  const [qr, setQr] = useState<string | null>(null);
  const c = card.data;
  useEffect(() => {
    if (!c) return;
    const url = `${window.location.origin}/dashboard`;
    QRCode.toDataURL(url, { margin: 0, width: 160, color: { dark: "#0b3d30", light: "#ffffff" } }).then(setQr).catch(() => setQr(null));
  }, [c]);
  const main = c?.totals[0];

  return (
    <div data-no-localize className="reveal min-w-0">
      <h1 className="text-3xl font-bold">{text("My Insight card", "بطاقتي في إنسايت")}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">{text("Your member card with the amounts in your deals. Soon you can add it to Apple Wallet or Google Wallet and see updates on your phone.",
        "بطاقة عضويتك مع مبالغ صفقاتك. قريباً تستطيع إضافتها إلى Apple Wallet أو Google Wallet لتصلك التحديثات على جوالك.")}</p>

      {card.isPending ? <PageSkeleton label={text("Loading…", "جارٍ التحميل…")} />
      : card.isError || !c ? <p role="alert" className="mt-6 text-destructive">{text("Your card could not be loaded.", "تعذّر تحميل بطاقتك.")}</p>
      : (
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          {/* The card: member-card style (not a bank card), Insight brand colours */}
          <div className="[perspective:1000px]"><div className="group relative aspect-[1.586/1] w-full overflow-hidden rounded-[22px] p-5 text-white shadow-[0_24px_48px_-24px_rgb(12_42_34/0.7)] transition-transform duration-500 ease-out [transform-style:preserve-3d] hover:[transform:rotateY(-10deg)_rotateX(5deg)] sm:p-6"
            style={{ background: "radial-gradient(120% 120% at 100% 0%, #5cc4ba 0%, rgba(92,196,186,0) 45%), linear-gradient(135deg, #138065 0%, #0c5a47 70%, #0b3d30 100%)" }}>
            <span className="checkout-sheen pointer-events-none absolute inset-0" /><svg aria-hidden className="pointer-events-none absolute -bottom-10 -end-10 size-48 opacity-[0.12] transition-transform duration-700 group-hover:rotate-45" viewBox="0 0 200 200"><circle cx="100" cy="100" r="96" fill="none" stroke="white" strokeWidth="2" /><circle cx="100" cy="100" r="64" fill="none" stroke="white" strokeWidth="2" /><circle cx="100" cy="100" r="32" fill="none" stroke="white" strokeWidth="2" /></svg>
            <div className="flex h-full flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <img src="/brand/insight-logo-white.svg" alt="Insight" className="h-7 w-auto" />
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider">{text("Member", "عضو")}</span>
              </div>
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-lg font-semibold sm:text-xl">{c.name}{c.verified && <BadgeCheck className="size-4 shrink-0 text-[#d6f0e6]" aria-label={text("Verified", "موثّق")} />}</p>
                  <p className="mt-1 font-mono text-sm tracking-[0.18em] text-white/85" dir="ltr">{c.memberRef}</p>
                  {main && <p className="mt-3 text-xs text-white/75">{text("Awaiting you", "بانتظار التحويل لك")} · <bdi className="font-semibold text-white">{formatMoney(main.awaitingYou, main.currency)}</bdi></p>}
                </div>
                {qr && <img src={qr} alt={text("QR code to open your Insight account", "رمز QR لفتح حسابك في إنسايت")} className="size-16 shrink-0 rounded-lg bg-white p-1.5 sm:size-[72px]" />}
              </div>
            </div>
          </div></div>

          <div className="min-w-0 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{text("Active deals", "صفقات جارية")}</p><p className="mt-1 text-2xl font-bold tabular-nums">{c.activeDeals}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{text("Completed deals", "صفقات مكتملة")}</p><p className="mt-1 text-2xl font-bold tabular-nums">{c.completedDeals}</p></CardContent></Card>
            </div>
            {c.totals.length === 0 ? (
              <Card><CardContent className="p-5 text-sm text-muted-foreground">{text("No amounts yet. When you pay into a deal or someone pays you, the amounts appear here.", "لا توجد مبالغ بعد. عندما تدفع في صفقة أو يدفع لك أحد، تظهر المبالغ هنا.")}</CardContent></Card>
            ) : c.totals.map((x) => (
              <Card key={x.currency}><CardContent className="p-5">
                <p className="text-sm font-semibold">{x.currency}</p>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                  <div><dt className="text-xs text-muted-foreground">{text("Held for your purchases", "محفوظ لمشترياتك")}</dt><dd className="mt-1 font-semibold tabular-nums"><bdi>{formatMoney(x.heldForYourPurchases, x.currency)}</bdi></dd></div>
                  <div><dt className="text-xs text-muted-foreground">{text("Awaiting you", "بانتظار التحويل لك")}</dt><dd className="mt-1 font-semibold tabular-nums text-primary"><bdi>{formatMoney(x.awaitingYou, x.currency)}</bdi></dd></div>
                  <div><dt className="text-xs text-muted-foreground">{text("Paid to you (12 months)", "حُوّل لك (12 شهراً)")}</dt><dd className="mt-1 font-semibold tabular-nums"><bdi>{formatMoney(x.paidToYou12m, x.currency)}</bdi></dd></div>
                </dl>
              </CardContent></Card>
            ))}
            <div className="flex items-start gap-3 rounded-xl bg-accent/60 p-4 text-xs leading-6">
              <Info className="mt-0.5 size-4 shrink-0 text-primary" />
              <p>{text("These are the amounts in your deals, held by the payment provider until each deal's conditions are met. It is not a balance or stored money with Insight. Demo: the payment provider is simulated and no real money moves.",
                "هذه مبالغ صفقاتك، محفوظة لدى مزوّد الدفع حتى تتحقق شروط كل صفقة، وليست رصيداً أو أموالاً مودعة لدى إنسايت. نسخة تجريبية: مزوّد الدفع محاكى ولا تتحرك أموال حقيقية.")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button disabled variant="outline"><Wallet className="size-4" />{text("Add to Apple Wallet · soon", "أضف إلى Apple Wallet · قريباً")}</Button>
              <Button disabled variant="outline"><Wallet className="size-4" />{text("Save to Google Wallet · soon", "احفظ في Google Wallet · قريباً")}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
