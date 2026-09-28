import { statusLabels, statusTone, type DealStatus } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/locale";

const toneClass = {
  muted: "bg-muted text-muted-foreground border-border",
  primary: "bg-primary/12 text-primary border-primary/30",
  warning: "bg-warning/12 text-warning border-warning/30",
  destructive: "bg-destructive/12 text-destructive border-destructive/30",
};

export function StatusBadge({ status, className }: { status: DealStatus; className?: string }) {
  const { locale } = useLocale();
  const arabicLabels: Record<DealStatus, string> = {
    draft: "مسودة",
    pending_funding: "بانتظار التمويل",
    held: "الأموال محجوزة",
    delivered: "تم التسليم",
    under_review: "قيد المراجعة",
    released: "تم الإفراج",
    refunded: "تم الاسترداد",
    disputed: "متنازع عليها",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
        toneClass[statusTone[status]],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {locale === "ar" ? arabicLabels[status] : statusLabels[status]}
    </span>
  );
}
