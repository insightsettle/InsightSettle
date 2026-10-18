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
  deal_type: string;
};

/** Live deals the signed-in user can see (RLS limits rows to their own deals). */
export function useMyDeals() {
  const [deals, setDeals] = useState<MyDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    supabase
      .from("deals")
      .select("id, ref, title, description, amount, currency, status, due_at, deal_type")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        setError(!!error);
        setDeals((data ?? []).map((d) => ({ ...d, amount: Number(d.amount) })));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision]);
  return { deals, loading, error, retry: () => setRevision((value) => value + 1) };
}
