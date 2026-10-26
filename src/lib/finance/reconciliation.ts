import { minor } from './money';
export type StatementRow = { provider_ref: string; amount: string; currency: string; kind: string; fee: string; bank_reference: string };
export type MatchTransaction = { id: string; provider_ref: string | null; amount: string; currency: string; kind: string; status: string };
export type MatchResult = { row: StatementRow; transactionId: string | null; outcome: 'matched' | 'duplicate' | 'missing' | 'ambiguous' | 'currency_mismatch' | 'amount_mismatch' | 'status_mismatch' | 'fee_unverified' };
export function reconcile(rows: StatementRow[], transactions: MatchTransaction[]): MatchResult[] {
  const seen = new Set<string>();
  return rows.map(row => {
    const key = `${row.provider_ref}:${row.kind}`;
    const candidates = transactions.filter(t => t.provider_ref === row.provider_ref && t.kind === row.kind);
    let outcome: MatchResult['outcome'] = 'matched';
    if (seen.has(key)) outcome = 'duplicate';
    else if (!candidates.length) outcome = 'missing';
    else if (candidates.length > 1) outcome = 'ambiguous';
    else {
      const t = candidates[0];
      if (!t) throw new Error('Missing candidate');
      if (t.currency !== row.currency) outcome = 'currency_mismatch';
      else if (minor(t.amount, t.currency) !== minor(row.amount, row.currency)) outcome = 'amount_mismatch';
      else if (t.status !== 'succeeded') outcome = 'status_mismatch';
      else if (row.fee !== '') outcome = 'fee_unverified';
    }
    seen.add(key);
    return { row, outcome, transactionId: candidates.length === 1 ? candidates[0]?.id ?? null : null };
  });
}
// Quoted RFC-style CSV cells; only a controlled statement schema is accepted.
export function parseStatement(csv: string): StatementRow[] {
  if (csv.length > 100000) throw new Error('Statement exceeds 100 KB');
  const records: string[][] = []; let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (c === '"') { if (quoted && csv[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (!quoted && (c === ',' || c === '\n')) { row.push(cell.replace(/\r$/, '')); cell = ''; if (c === '\n') { records.push(row); row = []; } }
    else cell += c;
  }
  if (quoted) throw new Error('Unclosed CSV quote');
  if (cell || row.length) { row.push(cell.replace(/\r$/, '')); records.push(row); }
  const header = records.shift()?.map(s => s.replace(/^\uFEFF/, '').trim());
  const fields = ['provider_ref','amount','currency','kind','fee','bank_reference'];
  if (!header || header.join(',') !== fields.join(',')) throw new Error('Use statement template headers');
  if (records.length > 200) throw new Error('Maximum 200 rows per upload');
  return records.filter(r => r.some(Boolean)).map(r => {
    if (r.length !== fields.length || r.some(c => c.length > 150)) throw new Error('Invalid row');
    const [provider_ref = '', amount = '', currency = '', kind = '', fee = '', bank_reference = ''] = r;
    if (!provider_ref || !['SAR','BHD','KWD','OMR','AED','QAR','USD'].includes(currency) || !['funding','release','refund'].includes(kind)) throw new Error('Invalid statement reference, currency or kind');
    if (minor(amount, currency) < 0n || (fee && minor(fee, currency) < 0n)) throw new Error('Negative statement amount');
    return { provider_ref, amount, currency, kind, fee, bank_reference };
  });
}