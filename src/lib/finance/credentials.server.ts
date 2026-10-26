/** AES-GCM encryption for provider credentials. Server only; key from FINANCE_CREDENTIAL_KEY. Never log values. */
const enc = new TextEncoder();
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function key(secret: string) {
  const raw = await crypto.subtle.digest('SHA-256', enc.encode(secret));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
function keySecret(override?: string) {
  const s = override ?? process.env['FINANCE_CREDENTIAL_KEY'];
  if (!s) throw new Error('Credential encryption key is not configured');
  return s;
}
export async function encryptCredential(value: string, override?: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(keySecret(override)), enc.encode(value)));
  return { ciphertext: b64(ct), iv: b64(iv) };
}
export async function decryptCredential(ciphertext: string, iv: string, override?: string) {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, await key(keySecret(override)), unb64(ciphertext));
  return new TextDecoder().decode(pt);
}
