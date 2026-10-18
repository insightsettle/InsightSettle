import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:insight_mobile/l10n.dart';
import 'package:insight_mobile/widgets/common.dart';

void main() {
  testWidgets('status badge and info row render in Arabic and English', (tester) async {
    AppLocale.notifier.value = const Locale('ar');
    await tester.pumpWidget(const MaterialApp(
      home: Directionality(
        textDirection: TextDirection.rtl,
        child: Scaffold(body: Column(children: [StatusBadge('held'), InfoRow('المبلغ', 'BHD 1,000.000')])),
      ),
    ));
    expect(find.text('الأموال محفوظة لدى مزوّد الدفع'), findsOneWidget);
    expect(find.text('BHD 1,000.000'), findsOneWidget);

    AppLocale.notifier.value = const Locale('en');
    await tester.pumpWidget(const MaterialApp(home: Scaffold(body: StatusBadge('pending_funding'))));
    expect(find.text('Pending funding'), findsOneWidget);
  });
}
