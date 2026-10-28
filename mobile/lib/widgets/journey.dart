import 'package:flutter/material.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../l10n.dart';
import '../models.dart';
import '../theme.dart';

/// Index of the current station (0 Agree … 4 Release); 5 when the deal has finished.
int journeyStep(Deal deal) {
  final s = deal.status;
  if (s == 'pending_funding') return deal.termsStatus == 'agreed' ? 1 : 0;
  if (s == 'held' || s == 'in_progress') return 2;
  if (s == 'delivered' || s == 'under_review' || s == 'disputed') return 3;
  return 5;
}

const _stations = [
  (PhosphorIconsDuotone.handshake, PhosphorIconsFill.handshake, 'Terms accepted'),
  (PhosphorIconsDuotone.lockSimple, PhosphorIconsFill.lockSimple, 'Funded'),
  (PhosphorIconsDuotone.truck, PhosphorIconsFill.truck, 'Delivered'),
  (PhosphorIconsDuotone.listMagnifyingGlass, PhosphorIconsFill.listMagnifyingGlass, 'Inspection'),
  (PhosphorIconsDuotone.coins, PhosphorIconsFill.coins, 'Released'),
];

/// The deal as a journey of five stations, as on the website: done stations are filled with a check,
/// the current one breathes, the road fills in as the deal moves.
class DealJourney extends StatefulWidget {
  const DealJourney({super.key, required this.deal});
  final Deal deal;
  @override
  State<DealJourney> createState() => _DealJourneyState();
}

class _DealJourneyState extends State<DealJourney> with TickerProviderStateMixin {
  late final AnimationController _intro = AnimationController(vsync: this, duration: const Duration(milliseconds: 900));
  late final AnimationController _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 1600));
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    if (MediaQuery.maybeDisableAnimationsOf(context) ?? false) {
      _intro.value = 1;
    } else {
      _intro.forward();
      _pulse.repeat();
    }
  }

  @override
  void dispose() {
    _intro.dispose();
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final step = journeyStep(widget.deal);
    final label = step >= _stations.length ? tr(_stations.last.$3) : tr(_stations[step].$3);
    return Semantics(
      label: '${tr('Deal progress')}: $label',
      child: ExcludeSemantics(
        child: Container(
          padding: const EdgeInsets.fromLTRB(8, 14, 8, 12),
          decoration: BoxDecoration(color: InsightColors.surface, borderRadius: BorderRadius.circular(18), border: Border.all(color: InsightColors.border)),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            for (var i = 0; i < _stations.length; i++)
              Expanded(
                child: AnimatedBuilder(
                  animation: _intro,
                  builder: (context, child) {
                    final t = Curves.easeOutBack.transform(Interval(i * 0.12, 0.5 + i * 0.12).transform(_intro.value));
                    return Opacity(opacity: t.clamp(0.0, 1.0).toDouble(), child: Transform.translate(offset: Offset(0, 8 * (1 - t)), child: child));
                  },
                  child: _cell(i, step),
                ),
              ),
          ]),
        ),
      ),
    );
  }

  Widget _cell(int i, int step) {
    final done = i < step;
    final current = i == step;
    final (duo, fill, text) = _stations[i];
    Widget road(bool visible, bool filled) => Expanded(
          child: visible
              ? AnimatedContainer(
                  duration: const Duration(milliseconds: 500),
                  height: 3,
                  decoration: BoxDecoration(color: filled ? InsightColors.brand1 : InsightColors.border, borderRadius: BorderRadius.circular(2)),
                )
              : const SizedBox.shrink(),
        );
    return Column(children: [
      SizedBox(
        height: 48,
        child: Stack(alignment: Alignment.center, children: [
          Row(children: [road(i > 0, i <= step), road(i < _stations.length - 1, i < step)]),
          if (current)
            AnimatedBuilder(
              animation: _pulse,
              builder: (context, _) => Container(
                width: 40 + 14 * _pulse.value,
                height: 40 + 14 * _pulse.value,
                decoration: BoxDecoration(shape: BoxShape.circle, color: InsightColors.brand1.withValues(alpha: 0.28 * (1 - _pulse.value))),
              ),
            ),
          AnimatedContainer(
            duration: const Duration(milliseconds: 400),
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: done ? InsightColors.primary : (current ? InsightColors.primarySubtle : InsightColors.surface),
              border: Border.all(color: done ? InsightColors.primary : (current ? InsightColors.brand1 : InsightColors.border), width: current ? 2 : 1.5),
              boxShadow: done || current ? const [BoxShadow(color: Color(0x33138065), blurRadius: 12, offset: Offset(0, 4))] : null,
            ),
            child: Center(
              child: done
                  ? PhosphorIcon(fill, size: 20, color: Colors.white)
                  : PhosphorIcon(duo, size: 21, color: current ? InsightColors.primary : InsightColors.muted, duotoneSecondaryOpacity: current ? 0.3 : 0.15),
            ),
          ),
          if (done)
            Align(
              alignment: const AlignmentDirectional(0.62, 0.62),
              child: Container(
                width: 16,
                height: 16,
                decoration: BoxDecoration(shape: BoxShape.circle, color: InsightColors.brand1, border: Border.all(color: Colors.white, width: 2)),
                child: const Center(child: PhosphorIcon(PhosphorIconsBold.check, size: 9, color: Colors.white)),
              ),
            ),
        ]),
      ),
      const SizedBox(height: 6),
      Text(
        tr(text),
        textAlign: TextAlign.center,
        maxLines: 2,
        style: TextStyle(fontSize: 11, height: 1.3, fontWeight: current ? FontWeight.w700 : FontWeight.w500, color: done || current ? InsightColors.ink : InsightColors.muted),
      ),
    ]);
  }
}

/// A thin five-segment progress line for deal cards.
class MiniJourney extends StatelessWidget {
  const MiniJourney({super.key, required this.deal});
  final Deal deal;
  @override
  Widget build(BuildContext context) {
    final step = journeyStep(deal);
    return Row(children: [
      for (var i = 0; i < _stations.length; i++)
        Expanded(
          child: Container(
            height: 4,
            margin: const EdgeInsetsDirectional.only(end: 3),
            decoration: BoxDecoration(
              color: i < step ? InsightColors.primary : (i == step ? InsightColors.brand1 : InsightColors.border),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
        ),
    ]);
  }
}
