import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:insight_mobile/l10n.dart';
import 'package:insight_mobile/models.dart';
import 'package:insight_mobile/screens/welcome.dart';
import 'package:insight_mobile/widgets/celebrate.dart';
import 'package:insight_mobile/widgets/illustrations.dart';
import 'package:insight_mobile/widgets/journey.dart';

Deal _deal(String status, {String terms = 'agreed'}) => Deal({'id': 'd1', 'ref': 'DL-1', 'title': 'Demo', 'status': status, 'terms_status': terms});

void main() {
  tearDown(() => AppLocale.notifier.value = const Locale('ar'));

  test('journey step follows the deal status', () {
    expect(journeyStep(_deal('pending_funding', terms: 'pending')), 0);
    expect(journeyStep(_deal('pending_funding')), 1);
    expect(journeyStep(_deal('held')), 2);
    expect(journeyStep(_deal('delivered')), 3);
    expect(journeyStep(_deal('released')), 5);
  });

  testWidgets('welcome story pages forward and ends with the first-deal choice', (tester) async {
    AppLocale.notifier.value = const Locale('ar');
    await tester.pumpWidget(const MaterialApp(home: WelcomeScreen()));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 600));
    expect(find.text('مبلغك ينتظر في المنتصف'), findsOneWidget);
    expect(find.text('تخطي'), findsOneWidget);
    for (var i = 0; i < 3; i++) {
      await tester.tap(find.byTooltip('التالي'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 700));
    }
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('تتأكد، ثم يُحوَّل المبلغ'), findsOneWidget);
    expect(find.text('ابدأ صفقتك الأولى'), findsOneWidget);
    expect(find.text('اذهب إلى صفقاتي'), findsOneWidget);
  });

  testWidgets('deal journey shows its five stations in English', (tester) async {
    AppLocale.notifier.value = const Locale('en');
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: DealJourney(deal: _deal('held')))));
    await tester.pump(const Duration(seconds: 1));
    for (final s in ['Terms accepted', 'Funded', 'Delivered', 'Inspection', 'Released']) {
      expect(find.text(s), findsOneWidget);
    }
  });

  testWidgets('celebration moment shows its title and closes on the button', (tester) async {
    AppLocale.notifier.value = const Locale('ar');
    await tester.pumpWidget(MaterialApp(
      home: Builder(
        builder: (context) => Scaffold(
          body: Center(child: FilledButton(onPressed: () => celebrate(context, art: Ill.release, title: tr('Deal complete')), child: const Text('go'))),
        ),
      ),
    ));
    await tester.tap(find.text('go'));
    await tester.pump(const Duration(milliseconds: 600));
    expect(find.text('اكتملت الصفقة'), findsOneWidget);
    await tester.tap(find.text('متابعة'));
    await tester.pump(const Duration(milliseconds: 600));
    expect(find.text('اكتملت الصفقة'), findsNothing);
  });
}
