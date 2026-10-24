import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:insight_mobile/l10n.dart';
import 'package:insight_mobile/screens/new_deal.dart';
import 'package:insight_mobile/widgets/common.dart';

void main() {
  tearDown(() => AppLocale.notifier.value = const Locale('ar'));

  testWidgets('new deal uses seller and client names in both languages', (tester) async {
    AppLocale.notifier.value = const Locale('ar');
    await tester.pumpWidget(const MaterialApp(home: NewDealScreen()));
    expect(find.text('أنا البائع'), findsOneWidget);
    await tester.tap(find.text('خدمات'));
    await tester.pumpAndSettle();
    expect(find.text('أنا مقدّم الخدمة'), findsOneWidget);

    AppLocale.notifier.value = const Locale('en');
    await tester.pumpWidget(const MaterialApp(home: SizedBox.shrink()));
    await tester.pumpWidget(const MaterialApp(home: NewDealScreen()));
    expect(find.text('I am the seller'), findsOneWidget);
    await tester.tap(find.text('Services'));
    await tester.pumpAndSettle();
    expect(find.text('I am the service provider'), findsOneWidget);
  });

  testWidgets('contextual payment labels and receipt button render in Arabic and English', (tester) async {
    for (final ar in [true, false]) {
      AppLocale.notifier.value = Locale(ar ? 'ar' : 'en');
      await tester.pumpWidget(MaterialApp(
        home: Directionality(
          textDirection: ar ? TextDirection.rtl : TextDirection.ltr,
          child: Scaffold(body: Column(children: [
            InfoRow(partyText('{Payer} pays', 'contracting'), 'BHD 1,000.000'),
            InfoRow(partyText('{Payee} receives', 'contracting'), 'BHD 970.000'),
            InfoRow(tr('Fee paid by'), feePayerLabel('split', 'contracting'), ltr: false),
            FilledButton(onPressed: () {}, child: Text(tr('Confirm receipt and release the payment'))),
            Text(tr('Outside the Gulf')),
            Text(tr('No VAT')),
          ])),
        ),
      ));
      expect(find.text(ar ? 'يدفع المالك' : 'Owner pays'), findsOneWidget);
      expect(find.text(ar ? 'يستلم المقاول' : 'Contractor receives'), findsOneWidget);
      expect(find.text(ar ? 'مناصفة بين الطرفين' : 'Split half and half'), findsOneWidget);
      expect(find.text(ar ? 'أكّد الاستلام وحوّل المبلغ' : 'Confirm receipt and release the payment'), findsOneWidget);
      expect(find.text(ar ? 'خارج الخليج (أي دولة)' : 'Outside the Gulf'), findsOneWidget);
      expect(find.text(ar ? 'لا توجد ضريبة' : 'No VAT'), findsOneWidget);
    }
  });

  testWidgets('status badge and info row render in Arabic and English', (tester) async {
    AppLocale.notifier.value = const Locale('ar');
    await tester.pumpWidget(const MaterialApp(
      home: Directionality(
        textDirection: TextDirection.rtl,
        child: Scaffold(body: Column(children: [StatusBadge('held'), InfoRow('المبلغ', 'BHD 1,000.000')])),
      ),
    ));
    expect(find.text('المبلغ محفوظ'), findsOneWidget);
    expect(find.text('BHD 1,000.000'), findsOneWidget);

    AppLocale.notifier.value = const Locale('en');
    await tester.pumpWidget(const MaterialApp(home: Scaffold(body: StatusBadge('pending_funding'))));
    expect(find.text('Pending funding'), findsOneWidget);
  });
}
