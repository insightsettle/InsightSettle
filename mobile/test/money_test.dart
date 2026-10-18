import 'package:flutter_test/flutter_test.dart';
import 'package:insight_mobile/money.dart';

void main() {
  test('formats with the currency minor units, like the website', () {
    expect(formatMoney(1000, 'BHD'), 'BHD 1,000.000');
    expect(formatMoney(10239.34, 'SAR'), 'SAR 10,239.34');
    expect(formatMoney(4079.294, 'KWD'), 'KWD 4,079.294');
    expect(formatMoney(0.5, 'USD'), 'USD 0.50');
    expect(formatMoney(1234567.891, 'OMR'), 'OMR 1,234,567.891');
    expect(formatMoney(-12.5, 'AED'), 'AED -12.50');
  });

  test('rounds half away from zero', () {
    expect(roundMoney(1316.00075, 'BHD'), 1316.001);
    expect(roundMoney(845.625, 'SAR'), 845.63);
  });

  test('checks decimals against the currency', () {
    expect(fitsMinorUnits(1000.5, 'BHD'), isTrue);
    expect(fitsMinorUnits(1000.505, 'SAR'), isFalse);
    expect(parseAmount('1,000.250'), 1000.25);
    expect(parseAmount(''), isNull);
  });
}
