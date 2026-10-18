import { useLocale, type Locale } from "@/lib/locale";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Locale; short: string; name: string; lang: string }[] = [
  { value: "ar", short: "ع", name: "العربية", lang: "ar" },
  { value: "en", short: "EN", name: "English", lang: "en" },
];

/**
 * Language switch: a compact two-option segmented control. Both languages are always visible and the
 * current one is highlighted, so the switch reads as a setting rather than a call-to-action button.
 */
export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  return (
    <div
      data-no-localize
      role="group"
      aria-label={locale === "ar" ? "لغة الموقع" : "Site language"}
      className={cn("inline-flex h-9 shrink-0 items-center rounded-full border border-border bg-card p-0.5", className)}
      dir="ltr"
    >
      {OPTIONS.map((o) => {
        const active = locale === o.value;
        return (
          <button
            key={o.value}
            type="button"
            lang={o.lang}
            aria-pressed={active}
            aria-label={o.name}
            title={o.name}
            onClick={() => { if (!active) setLocale(o.value); }}
            className={cn(
              "grid h-8 min-w-9 place-items-center rounded-full px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              o.value === "ar" && "text-sm",
              active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            {o.short}
          </button>
        );
      })}
    </div>
  );
}
