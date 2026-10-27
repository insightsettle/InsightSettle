import { statusLabels, type DealStatus } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/locale";

const toneClass = {
  success: "bg-success-subtle text-primary",
  warning: "bg-warning-subtle text-warning",
  danger: "bg-danger-subtle text-destructive",
  info: "bg-info-subtle text-info",
  neutral: "bg-muted text-muted-foreground",
  brand: "bg-secondary text-primary",
  gold: "bg-gold-subtle text-gold-foreground",
};
const statusTones: Record<string, keyof typeof toneClass> = {
  released: "success", completed: "success", refunded: "neutral",
  pending_acceptance: "warning", pending_funding: "warning", awaiting_action: "warning", under_review: "warning", partially_refunded: "warning",
  disputed: "danger", failed: "danger", rejected: "danger",
  shipped: "info", delivered: "info", in_inspection: "info", in_progress: "info",
  draft: "neutral", cancelled: "neutral", held: "brand", milestones: "gold", auctions: "gold",
};
const additionalLabels: Record<string, string> = { pending_acceptance: "Pending acceptance", awaiting_action: "Awaiting action", shipped: "Shipped", in_inspection: "In inspection", draft: "Draft", failed: "Failed", milestones: "Milestones", auctions: "Auctions" };
const arabicLabels: Record<DealStatus, string> = {
  pending_funding: "بانتظار الدفع", held: "المبلغ محفوظ", delivered: "تم التسليم", under_review: "قيد المراجعة", released: "تم التحويل للمورد", refunded: "تم الاسترداد", disputed: "متنازع عليها", in_progress: "قيد التنفيذ", completed: "مكتملة", cancelled: "ملغاة", rejected: "مرفوضة", partially_refunded: "مستردة جزئياً",
};
export function StatusBadge({ status, className }: { status: DealStatus | keyof typeof additionalLabels; className?: string }) {
  const { text } = useLocale();
  const label = statusLabels[status as DealStatus] ?? additionalLabels[status] ?? status;
  const tone = statusTones[status] ?? "neutral";
  // Statuses that wait on someone get a soft pulse so they stand out in lists.
  const live = tone === "warning" || tone === "danger";
  return <span data-no-localize className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition-colors", toneClass[tone], className)}>
    <span className="relative flex size-1.5 shrink-0">{live && <span className="absolute inset-0 rounded-full bg-current opacity-60 motion-safe:animate-ping" />}<span className="relative size-1.5 rounded-full bg-current" /></span>{text(label, arabicLabels[status as DealStatus])}
  </span>;
}
