import 'package:flutter/material.dart';

import '../l10n.dart';
import '../theme.dart';

/// Direction of user-entered text: right-to-left when its first letter is Arabic, otherwise left-to-right,
/// so English titles and notes keep their punctuation in place inside the Arabic app.
TextDirection dirFor(String text) {
  for (final r in text.runes) {
    if ((r >= 0x0600 && r <= 0x06FF) || (r >= 0x0750 && r <= 0x077F) || (r >= 0xFB50 && r <= 0xFEFF)) return TextDirection.rtl;
    if ((r >= 0x41 && r <= 0x5A) || (r >= 0x61 && r <= 0x7A)) return TextDirection.ltr;
  }
  return AppLocale.isArabic ? TextDirection.rtl : TextDirection.ltr;
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
              textAlign: TextAlign.end,
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
  final IconData? icon;
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
              if (icon != null) ...[Icon(icon, size: 20, color: InsightColors.primary), const SizedBox(width: 8)],
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
        const Icon(Icons.verified_user_outlined, size: 18, color: InsightColors.primary),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            tr('Demo of the escrow service: the payment provider is simulated and no real money moves. At launch, funds are held by a licensed payment provider; Insight runs the deal rules and keeps the record.'),
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
            const Icon(Icons.cloud_off_outlined, size: 40, color: InsightColors.muted),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            OutlinedButton(onPressed: onRetry, child: Text(tr('Try again'))),
          ]),
        ),
      );
}
