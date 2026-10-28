import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../l10n.dart';
import '../theme.dart';
import '../widgets/common.dart';
import '../widgets/illustrations.dart';
import '../widgets/phosphor.dart';

const _welcomeKey = 'insight.welcome.v1';

Future<bool> welcomeSeen() async {
  try {
    return (await SharedPreferences.getInstance()).getBool(_welcomeKey) ?? false;
  } catch (_) {
    return true; // storage unavailable: never block the app on the story
  }
}

Future<void> markWelcomeSeen() async {
  try {
    await (await SharedPreferences.getInstance()).setBool(_welcomeKey, true);
  } catch (_) {}
}

/// What the person chose on the last page of the story.
enum WelcomeChoice { newDeal, home }

const _slides = [
  (Ill.held, 'Your money waits in the middle', 'You pay into the deal, not to the other party. The amount is held until each side does what you agreed.'),
  (Ill.agree, 'Clear terms from the start', 'What is delivered, by when, and how it is accepted: one page that both of you accept before anyone pays.'),
  (Ill.deliver, 'Follow every step', 'Shipping, delivery and your checking time, on one page, with an update the moment something changes.'),
  (Ill.release, 'You check, then it is paid out', 'The seller is paid only after you receive and check. If something is wrong, you open a case before the money moves.'),
];

/// Four-page story shown once after the first sign-in, the same story as the website's /welcome.
class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});
  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen> {
  final _pages = PageController();
  int _i = 0;

  bool get _last => _i == _slides.length - 1;

  void _go(int n) => _pages.animateToPage(n.clamp(0, _slides.length - 1), duration: const Duration(milliseconds: 420), curve: Curves.easeOutCubic);
  void _finish(WelcomeChoice c) => Navigator.of(context).pop(c);

  @override
  void dispose() {
    _pages.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final rtl = Directionality.of(context) == TextDirection.rtl;
    return Scaffold(
      backgroundColor: InsightColors.background,
      body: Stack(children: [
        // Soft brand light behind the story.
        PositionedDirectional(top: -120, end: -90, child: _glow(InsightColors.brand1, 360)),
        PositionedDirectional(bottom: -140, start: -100, child: _glow(InsightColors.brand2, 340)),
        SafeArea(
          child: Column(children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 12, 0),
              child: Row(children: [
                const BrandLogo(height: 30),
                const Spacer(),
                TextButton(onPressed: () => _finish(WelcomeChoice.home), child: Text(tr('Skip'))),
              ]),
            ),
            Expanded(
              child: PageView.builder(
                controller: _pages,
                itemCount: _slides.length,
                onPageChanged: (i) => setState(() => _i = i),
                itemBuilder: (context, i) {
                  final (art, title, body) = _slides[i];
                  return LayoutBuilder(
                    builder: (context, c) => SingleChildScrollView(
                      padding: const EdgeInsets.symmetric(horizontal: 28),
                      child: ConstrainedBox(
                        constraints: BoxConstraints(minHeight: c.maxHeight),
                        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                      Illustration(art, width: ((c.maxHeight - 260) / 0.75).clamp(150.0, 300.0).toDouble()),
                      const SizedBox(height: 18),
                      Text(tr(title), textAlign: TextAlign.center, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w700, height: 1.35, color: InsightColors.ink)),
                      const SizedBox(height: 12),
                      Text(tr(body), textAlign: TextAlign.center, style: const TextStyle(fontSize: 16, height: 1.75, color: InsightColors.muted)),
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                        decoration: BoxDecoration(color: InsightColors.primarySubtle, borderRadius: BorderRadius.circular(999)),
                        child: Text(tr('Demo: the payment provider is simulated'), style: const TextStyle(fontSize: 11.5, color: InsightColors.primary)),
                      ),
                        ]),
                      ),
                    ),
                  );
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 20),
              child: Column(children: [
                Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  for (var k = 0; k < _slides.length; k++)
                    GestureDetector(
                      onTap: () => _go(k),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        curve: Curves.easeOut,
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        height: 8,
                        width: k == _i ? 28 : 8,
                        decoration: BoxDecoration(
                          color: k == _i ? InsightColors.primary : (k < _i ? InsightColors.primary.withValues(alpha: 0.45) : InsightColors.border),
                          borderRadius: BorderRadius.circular(99),
                        ),
                      ),
                    ),
                ]),
                const SizedBox(height: 18),
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 280),
                  transitionBuilder: (child, a) => FadeTransition(
                    opacity: a,
                    child: SlideTransition(position: Tween(begin: const Offset(0, 0.15), end: Offset.zero).animate(a), child: child),
                  ),
                  child: _last
                      ? Column(key: const ValueKey('last'), children: [
                          SizedBox(
                            width: double.infinity,
                            child: FilledButton.icon(
                              style: FilledButton.styleFrom(minimumSize: const Size(0, 56), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18))),
                              icon: const PhosphorIcon(PhosphorIconsBold.plus, size: 20),
                              label: Text(tr('Start your first deal')),
                              onPressed: () => _finish(WelcomeChoice.newDeal),
                            ),
                          ),
                          const SizedBox(height: 6),
                          TextButton(onPressed: () => _finish(WelcomeChoice.home), child: Text(tr('Go to my deals'))),
                        ])
                      : Row(key: const ValueKey('nav'), children: [
                          AnimatedOpacity(
                            opacity: _i == 0 ? 0 : 1,
                            duration: const Duration(milliseconds: 200),
                            child: TextButton(onPressed: _i == 0 ? null : () => _go(_i - 1), child: Text(tr('Back'))),
                          ),
                          const Spacer(),
                          FloatingActionButton(
                            heroTag: null,
                            tooltip: tr('Next'),
                            elevation: 4,
                            backgroundColor: InsightColors.primary,
                            foregroundColor: Colors.white,
                            shape: const CircleBorder(),
                            onPressed: () => _go(_i + 1),
                            child: PhosphorIcon(rtl ? PhosphorIconsBold.arrowLeft : PhosphorIconsBold.arrowRight, size: 24),
                          ),
                        ]),
                ),
              ]),
            ),
          ]),
        ),
      ]),
    );
  }

  Widget _glow(Color c, double size) => IgnorePointer(
        child: Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: RadialGradient(colors: [c.withValues(alpha: 0.22), c.withValues(alpha: 0)]),
          ),
        ),
      );
}
