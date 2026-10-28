import { useQuery } from "@tanstack/react-query";
import { Info, TriangleAlert } from "@/components/icons";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/lib/locale";
import { activeNotice, type PlatformSettings } from "@/lib/platform-switches";

type PublicSwitches = Pick<PlatformSettings, "new_deals_enabled" | "auctions_enabled" | "notice_active" | "notice_tone" | "notice_en" | "notice_ar">;

/** Public, read-only platform switches (RLS allows anyone to read the single row). */
export function usePlatformSwitches() {
  return useQuery({
    queryKey: ["platform-switches"],
    queryFn: async (): Promise<PublicSwitches | null> => {
      const { data, error } = await (supabase as any).from("platform_settings")
        .select("new_deals_enabled,auctions_enabled,notice_active,notice_tone,notice_en,notice_ar").eq("id", true).maybeSingle();
      if (error) return null;
      return data as PublicSwitches | null;
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}

/** Site-wide notice set by an admin in /console/platform. Renders nothing when inactive. */
export function SiteNotice() {
  const { locale } = useLocale();
  const q = usePlatformSwitches();
  const message = activeNotice(q.data, locale);
  if (!message) return null;
  const warning = q.data?.notice_tone === "warning";
  const Icon = warning ? TriangleAlert : Info;
  return (
    <div data-no-localize role="status" className={`flex min-w-0 items-start justify-center gap-2 px-4 py-2 text-center text-sm ${warning ? "bg-gold-subtle text-gold-foreground" : "bg-info-subtle text-foreground"}`}>
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span className="min-w-0 break-words">{message}</span>
    </div>
  );
}
