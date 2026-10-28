import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../l10n.dart';
import '../theme.dart';
import 'illustrations.dart';

/// A full-screen moment for the big steps of a deal (founder, 28 Oct 2026), the same as on the website:
/// an illustration that draws itself, one sentence, one button, brand confetti and a light haptic.
Future<void> celebrate(BuildContext context, {required Ill art, required String title, String? body, bool confetti = true}) {
  HapticFeedback.mediumImpact();
  Future.delayed(const Duration(milliseconds: 180), HapticFeedback.lightImpact);
  final reduce = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
  return showGeneralDialog<void>(
    context: context,
    barrierDismissible: true,
    barrierLabel: tr('Continue'),
    barrierColor: const Color(0x800C2A22),
    transitionDuration: Duration(milliseconds: reduce ? 0 : 420),
    pageBuilder: (ctx, _, __) => _Moment(art: art, title: title, body: body, confetti: confetti && !reduce),
    transitionBuilder: (ctx, a, _, child) {
      final c = CurvedAnimation(parent: a, curve: Curves.easeOutBack, reverseCurve: Curves.easeIn);
      return FadeTransition(opacity: a, child: ScaleTransition(scale: Tween(begin: 0.88, end: 1.0).animate(c), child: child));
    },
  );
}

class _Moment extends StatelessWidget {
  const _Moment({required this.art, required this.title, this.body, required this.confetti});
  final Ill art;
  final String title;
  final String? body;
  final bool confetti;

  @override
  Widget build(BuildContext context) {
    return Stack(children: [
      if (confetti) const Positioned.fill(child: IgnorePointer(child: Confetti())),
      Center(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Material(
            color: InsightColors.surface,
            borderRadius: BorderRadius.circular(28),
            elevation: 12,
            shadowColor: const Color(0x400C2A22),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 380),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(22, 18, 22, 22),
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  Illustration(art, width: 220),
                  const SizedBox(height: 6),
                  Text(title, textAlign: TextAlign.center, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: InsightColors.ink)),
                  if (body != null) ...[
                    const SizedBox(height: 8),
                    Text(body!, textAlign: TextAlign.center, style: const TextStyle(fontSize: 15, height: 1.6, color: InsightColors.muted)),
                  ],
                  const SizedBox(height: 18),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      autofocus: true,
                      style: FilledButton.styleFrom(minimumSize: const Size(0, 52), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                      onPressed: () => Navigator.of(context).pop(),
                      child: Text(tr('Continue')),
                    ),
                  ),
                ]),
              ),
            ),
          ),
        ),
      ),
    ]);
  }
}

/// Falling brand-coloured confetti, about three seconds, then nothing.
class Confetti extends StatefulWidget {
  const Confetti({super.key, this.count = 70});
  final int count;
  @override
  State<Confetti> createState() => _ConfettiState();
}

class _ConfettiState extends State<Confetti> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 3600))..forward();
  late final List<_Piece> _pieces = List.generate(widget.count, (i) => _Piece(math.Random(i * 7919 + DateTime.now().millisecond), i));

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => RepaintBoundary(child: CustomPaint(painter: _ConfettiPainter(_pieces, _c)));
}

const _confettiColors = [Color(0xFF55BD8A), Color(0xFF5CC4BA), Color(0xFF138065), Color(0xFFE3A33B), Color(0xFFF6FAF8)];

class _Piece {
  _Piece(math.Random r, int i)
      : x = r.nextDouble(),
        drift = (r.nextDouble() - 0.5) * 0.4,
        spin = (r.nextBool() ? 1 : -1) * (2 + r.nextDouble() * 3) * math.pi,
        start = r.nextDouble() * 0.15,
        speed = 0.6 + r.nextDouble() * 0.4,
        w = 6 + r.nextDouble() * 6,
        round = r.nextDouble() > 0.7,
        color = _confettiColors[i % _confettiColors.length];
  final double x, drift, spin, start, speed, w;
  final bool round;
  final Color color;
}

class _ConfettiPainter extends CustomPainter {
  _ConfettiPainter(this.pieces, this.t) : super(repaint: t);
  final List<_Piece> pieces;
  final Animation<double> t;

  @override
  void paint(Canvas canvas, Size size) {
    for (final p in pieces) {
      final v = ((t.value - p.start) / (1 - p.start) * (1 / p.speed)).clamp(0.0, 1.0).toDouble();
      if (v <= 0 || v >= 1) continue;
      final y = -20 + (size.height + 40) * Curves.easeIn.transform(v);
      final x = size.width * (p.x + p.drift * v);
      final alpha = v > 0.8 ? (1 - v) / 0.2 : 1.0;
      final paint = Paint()..color = p.color.withValues(alpha: alpha);
      canvas.save();
      canvas.translate(x, y);
      canvas.rotate(p.spin * v);
      if (p.round) {
        canvas.drawCircle(Offset.zero, p.w / 2, paint);
      } else {
        canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromCenter(center: Offset.zero, width: p.w, height: p.w * 1.6), const Radius.circular(2)), paint);
      }
      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(_ConfettiPainter old) => false;
}
