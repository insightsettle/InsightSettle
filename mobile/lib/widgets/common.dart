import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../l10n.dart';
import '../theme.dart';
import 'phosphor.dart';

/// Direction of user-entered text: right-to-left when its first letter is Arabic, otherwise left-to-right,
/// so English titles and notes keep their punctuation in place inside the Arabic app.
TextDirection dirFor(String text) {
  for (final r in text.runes) {
    if ((r >= 0x0600 && r <= 0x06FF) || (r >= 0x0750 && r <= 0x077F) || (r >= 0xFB50 && r <= 0xFEFF)) return TextDirection.rtl;
    if ((r >= 0x41 && r <= 0x5A) || (r >= 0x61 && r <= 0x7A)) return TextDirection.ltr;
  }
  return AppLocale.isArabic ? TextDirection.rtl : TextDirection.ltr;
}

/// User-entered text (titles, notes): its own direction for punctuation, aligned to the page's start.
class UserText extends StatelessWidget {
  const UserText(this.text, {super.key, this.style, this.maxLines, this.overflow});
  final String text;
  final TextStyle? style;
  final int? maxLines;
  final TextOverflow? overflow;
  @override
  Widget build(BuildContext context) => SizedBox(
        width: double.infinity,
        child: Text(
          text,
          textDirection: dirFor(text),
          textAlign: Directionality.of(context) == TextDirection.rtl ? TextAlign.right : TextAlign.left,
          style: style,
          maxLines: maxLines,
          overflow: overflow,
        ),
      );
}

/// Official Insight logo (assets copied from the website's public/brand).
class BrandLogo extends StatelessWidget {
  const BrandLogo({super.key, this.height = 36, this.light = false});
  final double height;
  final bool light;
  @override
  Widget build(BuildContext context) => Image.asset(
        light ? 'assets/brand/insight-logo-white.png' : 'assets/brand/insight-logo.png',
        height: height,
        semanticLabel: 'Insight',
      );
}

class StatusBadge extends StatelessWidget {
  const StatusBadge(this.status, {super.key, this.milestone = false});
  final String status;
  final bool milestone;

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = switch (status) {
      'disputed' || 'rejected' || 'cancelled' => (InsightColors.dangerSubtle, InsightColors.danger),
      'under_review' || 'revision_requested' || 'submitted' => (InsightColors.warningSubtle, InsightColors.warning),
      'pending_funding' || 'pending' => (const Color(0xFFEFF2F1), InsightColors.muted),
      _ => (InsightColors.primarySubtle, InsightColors.primary),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
      child: Text(
        milestone ? milestoneStatusLabel(status) : statusLabel(status),
        style: TextStyle(color: fg, fontSize: 12, fontWeight: FontWeight.w500),
      ),
    );
  }
}

/// Label / value row. Money values are wrapped in LTR so "BHD 1,000.000" reads correctly in Arabic.
class InfoRow extends StatelessWidget {
  const InfoRow(this.label, this.value, {super.key, this.strong = false, this.ltr = true});
  final String label;
  final String value;
  final bool strong;
  final bool ltr;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(child: Text(label, style: const TextStyle(color: InsightColors.muted, fontSize: 14))),
          const SizedBox(width: 12),
          Flexible(
            child: Text(
              value,
              textDirection: ltr ? TextDirection.ltr : dirFor(value),
              textAlign: Directionality.of(context) == TextDirection.rtl ? TextAlign.left : TextAlign.right,
              style: TextStyle(
                fontSize: strong ? 16 : 14,
                fontWeight: strong ? FontWeight.w700 : FontWeight.w500,
                color: InsightColors.ink,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class SectionCard extends StatelessWidget {
  const SectionCard({super.key, required this.title, required this.children, this.icon, this.trailing});
  final String title;
  final List<Widget> children;
  final Object? icon;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(children: [
              if (icon != null) ...[
                Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(color: InsightColors.primarySubtle, borderRadius: BorderRadius.circular(10)),
                  child: Center(child: PhosphorIcon(icon!, size: 19, color: InsightColors.primary, duotoneSecondaryOpacity: 0.3)),
                ),
                const SizedBox(width: 10),
              ],
              Expanded(child: Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700))),
              if (trailing != null) trailing!,
            ]),
            const SizedBox(height: 10),
            ...children,
          ],
        ),
      ),
    );
  }
}

/// Demo custody wording (C05 C-3), the same sentence family as the website.
class CustodyNote extends StatelessWidget {
  const CustodyNote({super.key});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: InsightColors.primarySubtle, borderRadius: BorderRadius.circular(10)),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const PhosphorIcon(PhosphorIconsDuotone.shieldCheck, size: 20, color: InsightColors.primary, duotoneSecondaryOpacity: 0.3),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            tr('Demo of the escrow service: the payment provider is simulated and no real money moves. At launch, funds will be held by a licensed payment provider; Insight runs the deal rules and keeps the record.'),
            style: const TextStyle(fontSize: 12.5, color: InsightColors.primary, height: 1.5),
          ),
        ),
      ]),
    );
  }
}

void showMessage(BuildContext context, String message, {bool error = false}) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
    content: Text(message),
    backgroundColor: error ? InsightColors.danger : InsightColors.primary,
    behavior: SnackBarBehavior.floating,
  ));
}

class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const PhosphorIcon(PhosphorIconsDuotone.cloudSlash, size: 44, color: InsightColors.muted),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            OutlinedButton(onPressed: onRetry, child: Text(tr('Try again'))),
          ]),
        ),
      );
}

/// Phosphor icon for each kind of deal, the same family as the website.
DuotoneIconData dealTypeIcon(String type) => switch (type) {
      'services' => PhosphorIconsDuotone.briefcase,
      'contracting' => PhosphorIconsDuotone.hammer,
      'freelance' => PhosphorIconsDuotone.laptop,
      'auction' => PhosphorIconsDuotone.gavel,
      _ => PhosphorIconsDuotone.package,
    };

/// Fades and lifts its child in, staggered by [index] (about 45 ms apart, capped), once.
class Appear extends StatelessWidget {
  const Appear({super.key, required this.index, required this.child});
  final int index;
  final Widget child;
  @override
  Widget build(BuildContext context) {
    if (MediaQuery.maybeDisableAnimationsOf(context) ?? false) return child;
    final delay = (index > 10 ? 10 : index) * 45;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: Duration(milliseconds: 380 + delay),
      curve: Interval(delay / (380 + delay), 1, curve: Curves.easeOutCubic),
      builder: (context, t, child) => Opacity(opacity: t, child: Transform.translate(offset: Offset(0, 14 * (1 - t)), child: child)),
      child: child,
    );
  }
}

/// Presses in a little under the finger, with a light tick, then runs [onTap].
class Pressable extends StatefulWidget {
  const Pressable({super.key, required this.child, required this.onTap});
  final Widget child;
  final VoidCallback onTap;
  @override
  State<Pressable> createState() => _PressableState();
}

class _PressableState extends State<Pressable> {
  bool _down = false;
  void _set(bool v) {
    if (_down != v) setState(() => _down = v);
  }

  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTapDown: (_) => _set(true),
          onTapCancel: () => _set(false),
          onTapUp: (_) => _set(false),
          onTap: () {
            HapticFeedback.selectionClick();
            widget.onTap();
          },
          child: AnimatedScale(
            scale: _down ? 0.975 : 1,
            duration: const Duration(milliseconds: 140),
            curve: Curves.easeOut,
            child: widget.child,
          ),
        ),
      );
}

/// A breathing placeholder list, used instead of a bare spinner while deals load.
class ListSkeleton extends StatefulWidget {
  const ListSkeleton({super.key, this.rows = 4});
  final int rows;
  @override
  State<ListSkeleton> createState() => _ListSkeletonState();
}

class _ListSkeletonState extends State<ListSkeleton> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1100))..repeat(reverse: true);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    Widget bar(double w, double h, {double r = 6}) => FractionallySizedBox(
          alignment: AlignmentDirectional.centerStart,
          widthFactor: w,
          child: Container(height: h, decoration: BoxDecoration(color: InsightColors.border, borderRadius: BorderRadius.circular(r))),
        );
    return Semantics(
      label: tr('Loading'),
      child: FadeTransition(
        opacity: Tween(begin: 0.45, end: 1.0).animate(_c),
        child: Column(children: [
          Container(height: 64, decoration: BoxDecoration(color: InsightColors.primarySubtle, borderRadius: BorderRadius.circular(10))),
          const SizedBox(height: 16),
          for (var i = 0; i < widget.rows; i++)
            Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: InsightColors.surface, borderRadius: BorderRadius.circular(18), border: Border.all(color: InsightColors.border)),
              child: Row(children: [
                Container(width: 40, height: 40, decoration: BoxDecoration(color: InsightColors.border, borderRadius: BorderRadius.circular(12))),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [bar(0.7, 12), const SizedBox(height: 8), bar(0.45, 10), const SizedBox(height: 12), bar(1, 4, r: 2)])),
              ]),
            ),
        ]),
      ),
    );
  }
}
