/// Currency minor units, the same table as the web (src/lib/money.ts).
const Map<String, int> kMinorUnits = {
  'SAR': 2,
  'USD': 2,
  'AED': 2,
  'QAR': 2,
  'BHD': 3,
  'KWD': 3,
  'OMR': 3,
};

int minorUnitsFor(String currency) => kMinorUnits[currency] ?? 2;

/// Same rounding as the web: half away from zero at the currency's minor unit.
double roundMoney(num amount, String currency) {
  final f = _pow10(minorUnitsFor(currency));
  final sign = amount < 0 ? -1 : 1;
  return sign * ((amount.abs() * f + 1e-9).round()) / f;
}

double _pow10(int n) {
  var r = 1.0;
  for (var i = 0; i < n; i++) {
    r *= 10;
  }
  return r;
}

/// "BHD 1,000.000", "SAR 10,239.34". Digits stay Latin in both languages, as on the website.
String formatMoney(num amount, String currency) {
  final d = minorUnitsFor(currency);
  final v = roundMoney(amount, currency);
  final negative = v < 0;
  final fixed = v.abs().toStringAsFixed(d);
  final parts = fixed.split('.');
  final whole = parts[0];
  final buf = StringBuffer();
  for (var i = 0; i < whole.length; i++) {
    if (i > 0 && (whole.length - i) % 3 == 0) buf.write(',');
    buf.write(whole[i]);
  }
  final frac = parts.length > 1 ? '.${parts[1]}' : '';
  return '$currency ${negative ? '-' : ''}$buf$frac';
}

num? parseAmount(String input) {
  final cleaned = input.replaceAll(',', '').trim();
  if (cleaned.isEmpty) return null;
  return num.tryParse(cleaned);
}

/// True when the amount has no more decimals than the currency allows.
bool fitsMinorUnits(num amount, String currency) {
  final f = _pow10(minorUnitsFor(currency));
  return ((amount * f) - (amount * f).roundToDouble()).abs() < 1e-6;
}
