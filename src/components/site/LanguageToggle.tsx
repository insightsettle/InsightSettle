import { Languages } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";

export function LanguageToggle({ className }: { className?: string }) {
  const { locale, toggleLocale } = useLocale();
  const label = locale === "en" ? "العربية" : "English";

  return (
    <Button
      data-no-localize
      type="button"
      variant="outline"
      size="sm"
      onClick={toggleLocale}
      aria-label={locale === "en" ? "Switch to Arabic" : "التبديل إلى الإنجليزية"}
      className={cn("gap-1.5", className)}
    >
      <Languages className="size-4" />
      <span>{label}</span>
    </Button>
  );
}
