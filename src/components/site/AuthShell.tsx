import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/site/BrandLogo";
import { LanguageToggle } from "@/components/site/LanguageToggle";
import { useLocale } from "@/lib/locale";

/** Authentication has its own quiet shell, independent of public/customer navigation. */
export function AuthShell({ children }: { children: ReactNode }) {
  const { direction, text } = useLocale();
  return (
    <main dir={direction} data-no-localize className="min-h-screen bg-background px-5 pb-10 pt-6 sm:pt-10">
      <header className="mx-auto grid max-w-md grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <Link to="/" aria-label={text("Insight home", "الرئيسية — إنسايت")} className="w-fit"><BrandLogo className="h-16 w-auto" /></Link>
        <LanguageToggle />
      </header>
      <div className="mx-auto mt-10 min-w-0 max-w-md sm:mt-14">{children}</div>
    </main>
  );
}