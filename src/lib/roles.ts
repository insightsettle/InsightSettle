/**
 * Party names by deal type (founder decision, 18 Oct 2026). The database keeps buyer_id / seller_id; only the words
 * people read change. Each side sees the name used in everyday life for that kind of deal:
 *   goods → buyer / seller · services & freelance → client / service provider · contracting → owner / contractor ·
 *   auction → winner / organiser. Where no deal is in view, the generic pair is payer / payee («الدافع» / «المستفيد»).
 */
export type Bi = [en: string, ar: string];
export type RoleKind = "goods" | "services" | "freelance" | "contracting" | "auction" | "generic";

/** One party's name. `en` is lower case ("buyer"); `ar` is definite ("المشتري"). */
export type RoleName = { en: string; ar: string };
export type Roles = { kind: RoleKind; payer: RoleName; payee: RoleName };

const TABLE: Record<RoleKind, { payer: RoleName; payee: RoleName }> = {
  goods: { payer: { en: "buyer", ar: "المشتري" }, payee: { en: "seller", ar: "البائع" } },
  services: { payer: { en: "client", ar: "العميل" }, payee: { en: "service provider", ar: "مقدّم الخدمة" } },
  freelance: { payer: { en: "client", ar: "العميل" }, payee: { en: "service provider", ar: "مقدّم الخدمة" } },
  contracting: { payer: { en: "owner", ar: "المالك" }, payee: { en: "contractor", ar: "المقاول" } },
  auction: { payer: { en: "winner", ar: "الفائز" }, payee: { en: "organiser", ar: "المنظّم" } },
  generic: { payer: { en: "payer", ar: "الدافع" }, payee: { en: "payee", ar: "المستفيد" } },
};

export function rolesFor(dealType: string | null | undefined): Roles {
  const kind = (dealType && dealType in TABLE ? dealType : "generic") as RoleKind;
  return { kind, ...TABLE[kind] };
}

export const GENERIC_ROLES = rolesFor(null);

/** "the buyer" / «المشتري» */
export const the = (r: RoleName): Bi => [`the ${r.en}`, r.ar];
/** "Buyer" / «المشتري» */
export const cap = (r: RoleName): Bi => [r.en.charAt(0).toUpperCase() + r.en.slice(1), r.ar];
/** "to the buyer" / «للمشتري» (Arabic lām fused with the article). */
export const to = (r: RoleName): Bi => [`to the ${r.en}`, arLam(r.ar)];
/** "the buyer's" / «المشتري» (Arabic iḍāfa needs no change). */
export const poss = (r: RoleName): Bi => [`the ${r.en}'s`, r.ar];

export function arLam(word: string) {
  return word.startsWith("ال") ? `لل${word.slice(2)}` : `ل${word}`;
}

/** Who pays the Insight fee, in this deal's words. */
export function feePayerLabel(feePayer: string | null | undefined, roles: Roles): Bi {
  if (feePayer === "seller") return [`${cap(roles.payee)[0]} pays the fee`, `يدفعها ${roles.payee.ar}`];
  if (feePayer === "split") return ["Split half and half", "مناصفة بين الطرفين"];
  return [`${cap(roles.payer)[0]} pays the fee`, `يدفعها ${roles.payer.ar}`];
}
