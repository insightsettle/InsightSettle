type AdminClient = {
  from: (table: string) => any;
};

export type NotifyInput = {
  dealId: string;
  dealRef?: string | null;
  title: string;
  body?: string | null;
  kind?: string;
  recipients: (string | null | undefined)[];
  excludeUserId?: string | null;
};

/**
 * Inserts in-app notifications for the given recipients.
 * Email delivery is added once the sender domain is verified.
 */
export async function notifyUsers(admin: AdminClient, input: NotifyInput) {
  const unique = Array.from(
    new Set(
      input.recipients.filter(
        (id): id is string => Boolean(id) && id !== (input.excludeUserId ?? undefined),
      ),
    ),
  );
  if (unique.length === 0) return { delivered: 0 };
  const rows = unique.map((userId) => ({
    user_id: userId,
    deal_id: input.dealId,
    kind: input.kind ?? "deal",
    title: input.title,
    body: input.body ?? null,
  }));
  const { error } = await admin.from("notifications").insert(rows);
  if (error) throw error;
  return { delivered: rows.length };
}

export async function notifyDealParties(
  admin: AdminClient,
  dealId: string,
  payload: { title: string; body?: string | null; kind?: string; excludeUserId?: string | null },
) {
  const { data: deal } = await admin
    .from("deals")
    .select("id, ref, buyer_id, seller_id")
    .eq("id", dealId)
    .maybeSingle();
  if (!deal) return { delivered: 0 };
  return notifyUsers(admin, {
    dealId,
    dealRef: deal.ref,
    title: payload.title,
    body: payload.body ?? null,
    kind: payload.kind ?? "deal",
    recipients: [deal.buyer_id, deal.seller_id],
    excludeUserId: payload.excludeUserId ?? null,
  });
}

export async function staffUserIds(admin: AdminClient) {
  const { data } = await admin.from("user_roles").select("user_id").eq("role", "admin");
  return (data ?? []).map((r: { user_id: string }) => r.user_id);
}
