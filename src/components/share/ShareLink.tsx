import QRCode from "qrcode";
import { Copy, MessageCircle, QrCode } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { whatsappShareUrl } from "@/lib/deal-links";
import { useLocale } from "@/lib/locale";

/** Copy, WhatsApp and QR for any Insight link. WhatsApp uses the public share URL (no account or API needed). */
export function ShareLink({ url, message, compact = false }: { url: string; message: string; compact?: boolean }) {
  const { text } = useLocale();
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  useEffect(() => { if (showQr && !qr) QRCode.toDataURL(url, { margin: 1, width: 220 }).then(setQr).catch(() => setQr(null)); }, [showQr, qr, url]);
  return (
    <div data-no-localize>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size={compact ? "sm" : "default"} variant="outline" onClick={() => { void navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); }}>
          <Copy className="size-4" />{copied ? text("Copied", "تم النسخ") : text("Copy link", "انسخ الرابط")}
        </Button>
        <Button type="button" size={compact ? "sm" : "default"} asChild className="bg-[#1f9d55] text-white hover:bg-[#178246]">
          <a href={whatsappShareUrl(message)} target="_blank" rel="noreferrer"><MessageCircle className="size-4" />{text("Share on WhatsApp", "شارك عبر واتساب")}</a>
        </Button>
        <Button type="button" size={compact ? "sm" : "default"} variant="ghost" aria-expanded={showQr} onClick={() => setShowQr((v) => !v)}>
          <QrCode className="size-4" />{text("QR code", "رمز QR")}
        </Button>
      </div>
      {showQr && (qr ? <img src={qr} alt={text("QR code for the link", "رمز QR للرابط")} className="mt-3 size-44 rounded-lg border bg-white p-2" /> : <p className="mt-3 text-xs text-muted-foreground">{text("Preparing…", "جارٍ التجهيز…")}</p>)}
    </div>
  );
}
