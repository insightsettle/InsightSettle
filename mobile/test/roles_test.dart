import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:insight_mobile/l10n.dart';
import 'package:insight_mobile/roles.dart';

void main() {
  tearDown(() => AppLocale.notifier.value = const Locale('ar'));

  const expected = {
    'goods': ['buyer', 'المشتري', 'seller', 'البائع'],
    'services': ['client', 'العميل', 'service provider', 'مقدّم الخدمة'],
    'freelance': ['client', 'العميل', 'service provider', 'مقدّم الخدمة'],
    'contracting': ['owner', 'المالك', 'contractor', 'المقاول'],
    'auction': ['winner', 'الفائز', 'organiser', 'المنظّم'],
  };
  for (final entry in expected.entries) {
    test('${entry.key} uses the approved party names', () {
      final roles = rolesFor(entry.key);
      expect([roles.payer.en, roles.payer.ar, roles.payee.en, roles.payee.ar], entry.value);
      AppLocale.notifier.value = const Locale('ar');
      expect(partyText('You are the {payer}', entry.key), 'أنت ${entry.value[1]}');
      expect(partyText('You are the {payee}', entry.key), 'أنت ${entry.value[3]}');
      expect(feePayerLabel('buyer', entry.key), 'يدفعها ${entry.value[1]}');
      expect(feePayerLabel('seller', entry.key), 'يدفعها ${entry.value[3]}');
    });
  }

  test('no deal context uses payer and payee, including unknown types', () {
    for (final type in <String?>[null, '', 'unknown']) {
      final roles = rolesFor(type);
      expect([roles.payer.en, roles.payer.ar, roles.payee.en, roles.payee.ar], ['payer', 'الدافع', 'payee', 'المستفيد']);
    }
  });

  test('Arabic payment preposition joins the contextual name', () {
    AppLocale.notifier.value = const Locale('ar');
    expect(partyText('The milestone amount less retention is released {payeeTo}.', 'contracting'),
        'يُفرج للمقاول عن مبلغ المرحلة بعد خصم المحتجزات.');
    AppLocale.notifier.value = const Locale('en');
    expect(partyText('The milestone amount less retention is released {payeeTo}.', 'contracting'),
        'The milestone amount less retention is released to the contractor.');
  });
}