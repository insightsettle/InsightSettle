import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export type MyDeal = {
  id: string;
  ref: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
  due_at: string | null;
};

/** Live deals the signed-in user can see (RLS limits rows to their own deals). */
export function useMyDeals() {
  const [deals, setDeals] = useState<MyDeal[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    supabase
      .from("deals")
      .select("id, ref, title, description, amount, currency, status, due_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!active) return;
        setDeals((data ?? []).map((d) => ({ ...d, amount: Number(d.amount) })));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  return { deals, loading };
}
