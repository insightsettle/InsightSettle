export function precision(currency: string) { return ['BHD', 'KWD', 'OMR'].includes(currency) ? 3 : 2; }
export function minor(value: string, currency: string): bigint {
  const p = precision(currency);
  if (!/^-?\d+(\.\d+)?$/.test(value)) throw new Error('Invalid decimal');
  const negative = value.startsWith('-');
  const [whole = '0', fraction = ''] = value.replace(/^-/, '').split('.');
  if (fraction.slice(p).replace(/0/g, '')) throw new Error('Currency precision exceeded');
  const units = BigInt(whole) * 10n ** BigInt(p) + BigInt(fraction.slice(0, p).padEnd(p, '0'));
  return negative ? -units : units;
}
export function decimal(units: bigint, currency: string): string {
  const p = precision(currency), sign = units < 0n ? '-' : '', absolute = units < 0n ? -units : units;
  const s = absolute.toString().padStart(p + 1, '0');
  return `${sign}${s.slice(0, -p)}.${s.slice(-p)}`;
}
export function add(values: string[], currency: string) { return decimal(values.reduce((sum, v) => sum + minor(v, currency), 0n), currency); }