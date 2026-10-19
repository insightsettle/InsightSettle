import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUpRight, Check, LoaderCircle, Mail, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "./BrandLogo";
import { useLocale } from "@/lib/locale";
import { contactRequestSchema } from "@/lib/contact-request";
import { submitContactRequest } from "@/lib/contact-request.functions";

export function ContactPopup() {
  const { text, direction } = useLocale();
  const submit = useServerFn(submitContactRequest);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const [retryAt, setRetryAt] = useState(0);
  const requestId = useRef<string | null>(null);

  useEffect(() => {
    let shown = false;
    try { shown = sessionStorage.getItem("insight-contact-shown") === "1"; } catch { /* Storage is optional. */ }
    if (shown) return;
    const timer = window.setTimeout(() => setOpen(true), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  function changeOpen(next: boolean) {
    setOpen(next);
    try { sessionStorage.setItem("insight-contact-shown", "1"); } catch { /* Storage is optional. */ }
  }

  return <Dialog.Root open={open} onOpenChange={changeOpen}>
    <Dialog.Trigger asChild><Button className="fixed bottom-5 end-5 z-40 h-12 gap-2 rounded-full px-5 shadow-lg" aria-label={text("Contact Insight", "تواصل مع إنسايت")}><MessageCircle className="size-5" />{text("Let's connect", "لنتواصل")}</Button></Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0" />
      <Dialog.Content dir={direction} data-no-localize className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md max-h-[calc(100dvh-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-6 text-start shadow-xl outline-none sm:p-9 motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:zoom-in-95">
        <Dialog.Close asChild><Button variant="ghost" size="icon" className="absolute end-3 top-3 rounded-full" aria-label={text("Close", "إغلاق")} title={text("Close", "إغلاق")}><X className="size-5" /></Button></Dialog.Close>
        <BrandLogo className="h-12 w-auto" />
        <div className="mt-7 flex size-14 items-center justify-center rounded-2xl bg-accent text-primary">{state === "sent" ? <Check className="size-7" /> : <Mail className="size-7" />}</div>
        <Dialog.Title className="mt-5 text-2xl font-bold leading-snug">{state === "sent" ? text("Thank you for your interest", "شكراً لاهتمامك") : text("Let's start a conversation", "خلّنا نتواصل")}</Dialog.Title>
        <Dialog.Description className="mt-3 text-base leading-7 text-muted-foreground">{state === "sent" ? text("Your request has been sent to the Insight team. We'll contact you at the email you shared.", "أُرسل طلبك إلى فريق إنسايت. سنتواصل معك عبر البريد الذي أرسلته.") : text("Interested in Insight? Leave your email and our team will get in touch.", "مهتم بإنسايت؟ اترك بريدك الإلكتروني، وسيتواصل معك فريقنا.")}</Dialog.Description>
        {state === "sent" ? <Dialog.Close asChild><Button className="mt-7 h-12 w-full">{text("Done", "تم")}</Button></Dialog.Close> : <form className="mt-6 space-y-4" onSubmit={async (event) => {
          event.preventDefault();
          if (state === "sending" || Date.now() < retryAt) return;
          requestId.current ??= crypto.randomUUID();
          const parsed = contactRequestSchema.safeParse({ email, consent, website, requestId: requestId.current });
          if (!parsed.success) { setError(text("Enter a valid email and agree to be contacted.", "أدخل بريداً صحيحاً ووافق على التواصل معك.")); return; }
          setState("sending"); setError("");
          try {
            const result = await submit({ data: parsed.data });
            if (result.status === "sent") { setState("sent"); return; }
            if (result.status === "rate_limited") setRetryAt(Date.now() + result.retryAfterSeconds * 1000);
            setError(result.status === "rate_limited" ? text("Please wait a little before trying again.", "يرجى الانتظار قليلاً قبل المحاولة مجدداً.") : text("Your request couldn't be sent. Please try again later.", "تعذّر إرسال طلبك. حاول مجدداً لاحقاً."));
          } catch { setError(text("Your request couldn't be sent. Please try again later.", "تعذّر إرسال طلبك. حاول مجدداً لاحقاً.")); }
          setState("idle");
        }}>
          <div className="space-y-2"><Label htmlFor="contact-email">{text("Your email", "بريدك الإلكتروني")}</Label><Input id="contact-email" type="email" dir="ltr" autoComplete="email" placeholder="you@example.com" required maxLength={200} value={email} disabled={state === "sending"} className="h-12 bg-background" onChange={(event) => { setEmail(event.target.value); requestId.current = null; }} /></div>
          <div hidden aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></div>
          <label className="flex items-start gap-2.5 text-sm leading-6 text-muted-foreground"><input type="checkbox" required checked={consent} disabled={state === "sending"} onChange={(event) => setConsent(event.target.checked)} className="mt-1.5 size-4 shrink-0 accent-primary" /><span>{text("I agree to be contacted about my interest in Insight.", "أوافق على التواصل معي بشأن اهتمامي بإنسايت.")} <Link to="/privacy" className="text-primary underline underline-offset-4">{text("Privacy policy", "سياسة الخصوصية")}</Link></span></label>
          {error && <p role="alert" className="text-sm leading-6 text-destructive">{error}</p>}
          <Button type="submit" disabled={state === "sending"} className="h-12 w-full text-base">{state === "sending" ? <><LoaderCircle className="size-4 animate-spin" />{text("Sending…", "جارٍ الإرسال…")}</> : <>{text("Contact me", "تواصلوا معي")}<ArrowUpRight className="size-4" /></>}</Button>
        </form>}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}