// Arabic wording for deal-log lines that are stored in English with numbers inside them.
const RULES: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^Dispute opened on (DL-\d+)$/, (m) => `فُتح نزاع على الصفقة ${m[1]}`],
  [/^Dispute decision on (DL-\d+)$/, (m) => `صدر قرار النزاع في الصفقة ${m[1]}`],
  [/^Dispute decision on (DL-\d+) \(milestone (\d+)\)$/, (m) => `صدر قرار النزاع في الصفقة ${m[1]} (المرحلة ${m[2]})`],
  [/^Funds are frozen until Insight reviews the case\. Upload evidence within 72 hours\.$/, () => "المبلغ مجمّد حتى يراجع فريق إنسايت القضية. أضف إثباتاتك خلال 72 ساعة."],
  [/^Dispute opened — release blocked$/, () => "فُتح نزاع، وتوقّف التحويل حتى القرار"],
  [/^Dispute opened on milestone (\d+) — its release is blocked$/, (m) => `فُتح نزاع على المرحلة ${m[1]}، وتوقّف تحويلها حتى القرار`],
  [/^Dispute decision proposed — buyer (\d+)% · supplier (\d+)% — awaiting a second staff approval$/, (m) => `اقتُرح قرار النزاع: المشتري ${m[1]}% · المورّد ${m[2]}%، بانتظار اعتماد موظف ثانٍ`],
  [/^Dispute resolved — Full refund to the buyer$/, () => "حُسم النزاع: استرداد كامل للمشتري"],
  [/^Dispute resolved — Full release to the seller$/, () => "حُسم النزاع: تحويل كامل للبائع"],
  [/^Dispute resolved — Split: buyer (\d+)% · seller (\d+)%$/, (m) => `حُسم النزاع: المشتري ${m[1]}% · البائع ${m[2]}%`],
  [/^([a-z ]+) · the other party has 48 hours to respond$/, (m) => `${REASONS[m[1] ?? ""] ?? m[1]} · لدى الطرف الآخر 48 ساعة للرد`],
];
const REASONS: Record<string, string> = {
  "not received": "لم يصل المنتج", "wrong item": "منتج مختلف", damaged: "منتج تالف", "damaged item": "منتج تالف",
  "quantity mismatch": "الكمية غير مطابقة", "quality issue": "مشكلة في الجودة", "late delivery": "تأخر التسليم", other: "سبب آخر",
};
export function logAr(s: string | null | undefined): string | null {
  if (!s) return null;
  for (const [re, fn] of RULES) { const m = s.match(re); if (m) return fn(m); }
  return null;
}
export function reasonAr(code: string): string | null { return REASONS[code.replace(/_/g, " ")] ?? null; }
