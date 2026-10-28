import 'dart:math' as math;
import 'package:flutter/material.dart';

import '../theme.dart';

/// Insight line illustrations, the same drawings as the website (founder, 28 Oct 2026: a story-like experience).
/// Round-capped lines in brand green with mint accents over a soft blob. Lines draw themselves on first show,
/// staggered; dashed routes flow and a coin travels into the held box. With reduced motion they appear still.
/// Decorative only: the text beside each drawing carries the meaning.

const _sun = Color(0xFFE3A33B);

class _Stroke {
  const _Stroke(this.path, this.color, {this.width = 3, this.delay = 0, this.dashed = false});
  final Path path;
  final Color color;
  final double width;
  final double delay; // seconds
  final bool dashed;
}

class _Dot {
  const _Dot(this.center, this.radius, this.color, {this.delay = 0});
  final Offset center;
  final double radius;
  final Color color;
  final double delay;
}

class _Art {
  const _Art({required this.blob, required this.strokes, this.dots = const [], this.coinRoute});
  final (Offset, double, Color) blob;
  final List<_Stroke> strokes;
  final List<_Dot> dots;
  final Path? coinRoute;
}

enum Ill { agree, held, deliver, release, empty, calm }

/// One illustration in a 240 × 180 frame, scaled to [width].
class Illustration extends StatefulWidget {
  const Illustration(this.kind, {super.key, this.width = 260, this.still = false});
  final Ill kind;
  final double width;
  final bool still;

  @override
  State<Illustration> createState() => _IllustrationState();
}

class _IllustrationState extends State<Illustration> with TickerProviderStateMixin {
  late final AnimationController _draw = AnimationController(vsync: this, duration: const Duration(milliseconds: 2200));
  late final AnimationController _loop = AnimationController(vsync: this, duration: const Duration(milliseconds: 2600));
  late final _Art _art = _build(widget.kind);
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    final reduce = widget.still || (MediaQuery.maybeDisableAnimationsOf(context) ?? false);
    if (reduce) {
      _draw.value = 1;
    } else {
      _draw.forward();
      _loop.repeat();
    }
  }

  @override
  void dispose() {
    _draw.dispose();
    _loop.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
        child: SizedBox(
          width: widget.width,
          height: widget.width * 0.75,
          child: RepaintBoundary(
            child: CustomPaint(painter: _Painter(_art, _draw, _loop)),
          ),
        ),
      );
}

class _Painter extends CustomPainter {
  _Painter(this.art, this.draw, this.loop) : super(repaint: Listenable.merge([draw, loop]));
  final _Art art;
  final Animation<double> draw;
  final Animation<double> loop;

  static const _total = 2.2; // seconds of the draw controller
  static const _each = 0.7; // seconds one line takes to draw

  double _progress(double delay) => ((draw.value * _total - delay) / _each).clamp(0.0, 1.0).toDouble();

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.scale(size.width / 240, size.height / 180);

    final (c, r, tone) = art.blob;
    final bp = Curves.easeOut.transform(_progress(0));
    canvas.drawCircle(c, r * (0.85 + 0.15 * bp), Paint()..color = tone.withValues(alpha: 0.15 * bp));

    for (final s in art.strokes) {
      final paint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = s.width
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..color = s.color;
      if (s.dashed) {
        final fade = _progress(0.6);
        if (fade == 0) continue;
        paint.color = s.color.withValues(alpha: s.color.a * fade);
        _dashes(canvas, s.path, paint, offset: -loop.value * 12);
        continue;
      }
      final p = Curves.easeInOutCubic.transform(_progress(s.delay));
      if (p == 0) continue;
      if (p >= 1) {
        canvas.drawPath(s.path, paint);
        continue;
      }
      for (final m in s.path.computeMetrics()) {
        canvas.drawPath(m.extractPath(0, m.length * p), paint);
      }
    }

    for (final d in art.dots) {
      final p = Curves.easeOutBack.transform(_progress(d.delay));
      if (p <= 0) continue;
      canvas.drawCircle(d.center, d.radius * p, Paint()..color = d.color);
    }

    final route = art.coinRoute;
    if (route != null && draw.value > 0.45) {
      final m = route.computeMetrics().firstOrNull;
      final t = m?.getTangentForOffset(m.length * Curves.easeInOut.transform(loop.value));
      if (t != null) {
        final fade = loop.value > 0.85 ? (1 - loop.value) / 0.15 : 1.0;
        canvas.drawCircle(t.position, 6, Paint()..color = _sun.withValues(alpha: fade));
      }
    }
    canvas.restore();
  }

  void _dashes(Canvas canvas, Path path, Paint paint, {double offset = 0}) {
    const on = 6.0, gap = 7.0;
    for (final m in path.computeMetrics()) {
      var start = offset % (on + gap);
      if (start > 0) start -= on + gap;
      for (var x = start; x < m.length; x += on + gap) {
        final a = math.max(0.0, x), b = math.min(m.length, x + on);
        if (b > a) canvas.drawPath(m.extractPath(a, b), paint);
      }
    }
  }

  @override
  bool shouldRepaint(_Painter old) => old.art != art;
}

// ---------------------------------------------------------------- drawings (240 × 180, as on the website)

Path _line(List<Offset> pts, {bool close = false}) {
  final p = Path()..moveTo(pts.first.dx, pts.first.dy);
  for (final o in pts.skip(1)) {
    p.lineTo(o.dx, o.dy);
  }
  if (close) p.close();
  return p;
}

Path _circle(double x, double y, double r) => Path()..addOval(Rect.fromCircle(center: Offset(x, y), radius: r));
Path _rrect(double x, double y, double w, double h, double r) => Path()..addRRect(RRect.fromLTRBR(x, y, x + w, y + h, Radius.circular(r)));
Path _head(double x, double y) => _circle(x, y, 11);
Path _shoulders(double x) => Path()
  ..moveTo(x - 18, 112)
  ..arcToPoint(Offset(x + 18, 112), radius: const Radius.circular(18));

const _p = InsightColors.primary;
const _mint = InsightColors.brand1;
const _teal = InsightColors.brand2;
Color _soft(double a) => _p.withValues(alpha: a);

_Art _build(Ill kind) {
  switch (kind) {
    case Ill.agree:
      return _Art(blob: (const Offset(120, 92), 70.0, _mint), strokes: [
        _Stroke(_rrect(72, 28, 96, 124, 12), _p),
        for (final (i, y) in [52.0, 72.0, 92.0].indexed) ...[
          _Stroke(_line([Offset(88, y), Offset(93, y + 5), Offset(102, y - 5)]), _mint, width: 3.5, delay: 0.35 + i * 0.18),
          _Stroke(_line([Offset(110, y), Offset(150, y)]), _soft(0.4), delay: 0.45 + i * 0.18),
        ],
        _Stroke(_line([const Offset(88, 118), const Offset(132, 118)]), _soft(0.3), delay: 1),
        _Stroke(_line([const Offset(186, 40), const Offset(150, 104), const Offset(144, 118), const Offset(156, 109), const Offset(192, 45)], close: true), _p, delay: 0.8),
        _Stroke(_circle(160, 138, 18), _mint, delay: 1.1),
        _Stroke(_line([const Offset(152, 138), const Offset(158, 144), const Offset(169, 132)]), _p, width: 3.5, delay: 1.35),
      ]);
    case Ill.held:
      final route = Path()
        ..moveTo(58, 96)
        ..cubicTo(80, 60, 96, 62, 104, 84);
      return _Art(
        blob: (const Offset(120, 92), 62.0, _mint),
        strokes: [
          _Stroke(_head(40, 70), _p),
          _Stroke(_shoulders(40), _p, delay: 0.15),
          _Stroke(_head(200, 70), _p, delay: 0.1),
          _Stroke(_shoulders(200), _p, delay: 0.25),
          _Stroke(route, _mint, dashed: true),
          _Stroke(Path()..moveTo(136, 84)..cubicTo(144, 62, 160, 60, 182, 96), _soft(0.25), dashed: true),
          _Stroke(_rrect(100, 84, 40, 34, 8), _p, delay: 0.45),
          _Stroke(
              Path()
                ..moveTo(110, 84)
                ..lineTo(110, 76)
                ..arcToPoint(const Offset(130, 76), radius: const Radius.circular(10))
                ..lineTo(130, 84),
              _p,
              delay: 0.7),
          _Stroke(_line([const Offset(120, 103), const Offset(120, 109)]), _mint, delay: 0.9),
          _Stroke(_line([const Offset(70, 140), const Offset(170, 140)]), _soft(0.2), delay: 1),
        ],
        dots: const [_Dot(Offset(120, 100), 3.5, _mint, delay: 0.8)],
        coinRoute: route,
      );
    case Ill.deliver:
      return _Art(blob: (const Offset(120, 92), 70.0, _teal), strokes: [
        _Stroke(_line([const Offset(44, 120), const Offset(74, 106), const Offset(104, 120), const Offset(74, 134)], close: true), _p),
        _Stroke(
            _line([const Offset(44, 120), const Offset(44, 146), const Offset(74, 160), const Offset(74, 134)])
              ..addPath(_line([const Offset(104, 120), const Offset(104, 146), const Offset(74, 160)]), Offset.zero),
            _p,
            delay: 0.25),
        _Stroke(_line([const Offset(59, 113), const Offset(89, 127)]), _mint, delay: 0.5),
        _Stroke(Path()..moveTo(112, 112)..cubicTo(140, 100, 150, 70, 176, 66), _mint, dashed: true),
        _Stroke(
            Path()
              ..moveTo(188, 30)
              ..arcToPoint(const Offset(204, 46), radius: const Radius.circular(16))
              ..cubicTo(204, 60, 188, 74, 188, 74)
              ..cubicTo(188, 74, 172, 60, 172, 46)
              ..arcToPoint(const Offset(188, 30), radius: const Radius.circular(16))
              ..close(),
            _p,
            delay: 0.7),
        _Stroke(_circle(188, 46, 5), _mint, delay: 1),
        _Stroke(_line([const Offset(150, 150), const Offset(206, 150)]), _soft(0.2), delay: 1),
      ]);
    case Ill.release:
      return _Art(blob: (const Offset(120, 92), 64.0, _mint), strokes: [
        _Stroke(_circle(120, 84, 40), _p, width: 3.5),
        _Stroke(_line([const Offset(102, 85), const Offset(114, 97), const Offset(140, 69)]), _mint, width: 5, delay: 0.45),
        for (final (i, (x, y)) in [(60.0, 46.0), (184.0, 52.0), (176.0, 128.0), (62.0, 124.0)].indexed)
          _Stroke(
              _line([Offset(x, y - 7), Offset(x, y + 7)])..addPath(_line([Offset(x - 7, y), Offset(x + 7, y)]), Offset.zero),
              _sun,
              delay: 0.8 + i * 0.12),
        _Stroke(Path()..addOval(Rect.fromCenter(center: const Offset(120, 150), width: 44, height: 12)), _soft(0.4), delay: 1.1),
        _Stroke(Path()..addOval(Rect.fromCenter(center: const Offset(120, 143), width: 44, height: 12)), _soft(0.6), delay: 1.2),
      ]);
    case Ill.empty:
      return _Art(blob: (const Offset(120, 96), 58.0, _sun), strokes: [
        _Stroke(Path()..moveTo(78, 108)..arcToPoint(const Offset(162, 108), radius: const Radius.circular(42)), _sun),
        for (final (i, a) in [-60.0, -30.0, 0.0, 30.0, 60.0].indexed)
          _Stroke(
              _line([
                Offset(120 + math.cos((a - 90) * math.pi / 180) * 52, 108 + math.sin((a - 90) * math.pi / 180) * 52),
                Offset(120 + math.cos((a - 90) * math.pi / 180) * 62, 108 + math.sin((a - 90) * math.pi / 180) * 62),
              ]),
              _sun,
              delay: 0.3 + i * 0.08),
        _Stroke(_line([const Offset(40, 108), const Offset(200, 108)]), _soft(0.4), delay: 0.2),
        _Stroke(_line([const Offset(92, 116), const Offset(148, 116), const Offset(148, 158), const Offset(92, 158)], close: true), _p, delay: 0.6),
        _Stroke(_line([const Offset(104, 130), const Offset(136, 130)])..addPath(_line([const Offset(104, 142), const Offset(124, 142)]), Offset.zero), _soft(0.3), delay: 0.9),
      ]);
    case Ill.calm:
      return _Art(blob: (const Offset(120, 92), 70.0, _mint), strokes: [
        _Stroke(_line([const Offset(120, 46), const Offset(120, 146)])..addPath(_line([const Offset(92, 146), const Offset(148, 146)]), Offset.zero), _p),
        _Stroke(_circle(120, 40, 6), _p, delay: 0.2),
        _Stroke(_line([const Offset(68, 62), const Offset(172, 62)]), _p, delay: 0.3),
        _Stroke(
            _line([const Offset(68, 62), const Offset(52, 98), const Offset(84, 98)], close: true)
              ..addPath(_line([const Offset(172, 62), const Offset(156, 98), const Offset(188, 98)], close: true), Offset.zero),
            _mint,
            delay: 0.55),
      ]);
  }
}
