/** Browser-safe projection of stored credentials: never includes ciphertext, iv or any value except the last 4 characters. */
export type StoredCredential = { id: string; provider: string; environment: string; field: string; ciphertext?: string; iv?: string; last4: string; set_by: string; set_at: string; status: string; proposal_id: string | null };
export type MaskedCredential = { id: string; provider: string; environment: string; field: string; masked: string; setBy: string; setAt: string; status: string; proposalId: string | null };
export function projectCredential(r: StoredCredential): MaskedCredential {
  return { id: r.id, provider: r.provider, environment: r.environment, field: r.field, masked: `••••${r.last4}`, setBy: r.set_by, setAt: r.set_at, status: r.status, proposalId: r.proposal_id };
}
export const last4 = (value: string) => value.slice(-4);
