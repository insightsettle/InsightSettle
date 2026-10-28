import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api.dart';
import '../config.dart';
import '../deal_rules.dart';
import '../l10n.dart';
import '../models.dart';
import '../money.dart';
import '../theme.dart';
import '../widgets/celebrate.dart';
import '../widgets/common.dart';
import '../widgets/dialogs.dart';
import '../widgets/illustrations.dart';
import '../widgets/journey.dart';
import '../widgets/phosphor.dart';

const kPayCurrencies = ['SAR', 'AED', 'BHD', 'KWD', 'QAR', 'OMR', 'USD'];

class DealDetailScreen extends StatefulWidget {
  const DealDetailScreen({super.key, required this.dealRef});
  final String dealRef;
  @override
  State<DealDetailScreen> createState() => _DealDetailScreenState();
}

class _DealDetailScreenState extends State<DealDetailScreen> {
  late Future<DealBundle?> _future = api.loadDeal(widget.dealRef);
  bool _busy = false;
  FxQuote? _quote;
  String? _payCurrency;
  Timer? _tick;
  String _dealType = 'goods';

  @override
  void initState() {
    super.initState();
    _tick = Timer.periodic(const Duration(seconds: 15), (_) {
      if (mounted && _quote != null) setState(() {});
    });
  }

  @override
  void dispose() {
    _tick?.cancel();
    super.dispose();
  }

  void _reload() => setState(() {
        _quote = null;
        _future = api.loadDeal(widget.dealRef);
      });

  /// Runs one server action, shows its message, then reloads the deal.
  Future<void> _run(String action, Map<String, dynamic> body, {String? done, bool reload = true}) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final result = await api.action(action, body);
      if (!mounted) return;
      if (result is Map && result['ok'] == false) {
        showMessage(context, tr(result['message']?.toString() ?? 'The action could not be completed.'), error: true);
        if (reload) _reload();
        return;
      }
      final moment = _moment(action, body);
      if (moment == null) {
        final msg = result is Map && result['message'] is String ? tr(result['message'] as String) : (done ?? tr('Done.'));
        showMessage(context, msg);
      }
      if (reload) _reload();
      if (moment != null) await moment();
    } on ApiException catch (e) {
      if (mounted) showMessage(context, tr(e.message), error: true);
    } catch (_) {
      if (mounted) showMessage(context, tr('The service is not reachable right now. Please try again.'), error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  /// The big steps of a deal get a full-screen moment instead of a snackbar (same moments as the website).
  Future<void> Function()? _moment(String action, Map<String, dynamic> body) {
    final t = _dealType;
    return switch (action) {
      'accept-terms' => () => celebrate(context, art: Ill.agree, title: tr('Terms accepted'), body: partyText('Next, the {payer} pays into the deal. Nothing reaches the other party before delivery.', t), confetti: false),
      'fund' when body['simulateDecline'] != true =>
        () => celebrate(context, art: Ill.held, title: tr('Your money is in the deal'), body: tr('It stays held until delivery is received and checked. Demo: no real money moves.')),
      'confirm-delivery' => () => celebrate(context, art: Ill.deliver, title: tr('Delivery confirmed'), body: partyText("The {payer}'s inspection period starts now.", t), confetti: false),
      'approve-milestone' => () => celebrate(context, art: Ill.release, title: tr('Milestone approved'), body: partyText('The milestone amount less retention is released {payeeTo}.', t)),
      'release' => () => celebrate(context, art: Ill.release, title: tr('Deal complete'), body: partyText('The payment is on its way {payeeTo}. Thank you for dealing with trust.', t)),
      _ => null,
    };
  }

  Future<void> _getQuote(Deal d, Pricing? p) async {
    setState(() => _busy = true);
    try {
      final q = await api.action('quote', {'dealId': d.id, 'payCurrency': _payCurrency ?? p?.payCurrency ?? 'SAR'});
      if (mounted) setState(() => _quote = FxQuote((q as Map).cast<String, dynamic>()));
    } on ApiException catch (e) {
      if (mounted) showMessage(context, tr(e.message), error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.dealRef, textDirection: TextDirection.ltr)),
      body: FutureBuilder<DealBundle?>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) return const Center(child: CircularProgressIndicator());
          if (snap.hasError) return ErrorView(message: tr('The deal could not be loaded.'), onRetry: _reload);
          final b = snap.data;
          if (b == null) return Center(child: Text(tr('This deal is not available for your account.')));
          return RefreshIndicator(
            onRefresh: () async => _reload(),
            child: Stack(children: [
              ListView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 40),
                children: _content(b),
              ),
              if (_busy) const LinearProgressIndicator(minHeight: 3),
            ]),
          );
        },
      ),
    );
  }

  List<Widget> _content(DealBundle b) {
    final d = b.deal;
    _dealType = d.dealType;
    final uid = currentUserId;
    final isBuyer = d.buyerId == uid;
    final actions = dealActions(d, b.milestones, uid);
    final p = b.pricing;
    final gap = const SizedBox(height: 14);
    return [
      // Header
      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [InsightColors.brand1, InsightColors.primary], begin: AlignmentDirectional.topStart, end: AlignmentDirectional.bottomEnd),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Center(child: PhosphorIcon(dealTypeIcon(d.dealType), size: 26, color: Colors.white, duotoneSecondaryOpacity: 0.35)),
        ),
        const SizedBox(width: 12),
        Expanded(child: UserText(d.title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700))),
      ]),
      const SizedBox(height: 10),
      Align(alignment: AlignmentDirectional.centerStart, child: StatusBadge(d.status)),
      const SizedBox(height: 6),
      Text('${dealTypeLabel(d.dealType)} · ${partyText(isBuyer ? 'You are the {payer}' : 'You are the {payee}', d.dealType)}',
          style: const TextStyle(color: InsightColors.muted)),
      if (d.description.isNotEmpty) ...[const SizedBox(height: 8), UserText(d.description)],
      gap,
      DealJourney(deal: d),
      gap,
      if (d.frozen)
        _banner(tr('This deal is on hold by Insight. Contact Insight support.'), InsightColors.dangerSubtle, InsightColors.danger),
      if (d.status == 'delivered' && d.autoReleaseAt != null)
        _banner(
          '${tr('Inspection ends')} ${_date(d.autoReleaseAt!)}. ${partyText(d.autoReleaseEnabled ? 'If the {payer} takes no action, the funds are released {payeeTo}.' : 'Auto-release is off: the {payer} must accept manually.', d.dealType)}',
          InsightColors.warningSubtle,
          InsightColors.warning,
        ),
      if (nextStep(d, b.milestones, uid) != null) ...[
        _banner('${tr('Next step')}: ${partyText(nextStep(d, b.milestones, uid)!, d.dealType)}', InsightColors.primarySubtle, InsightColors.primary),
      ],
      // Amount summary
      SectionCard(title: tr('Amount summary'), icon: PhosphorIconsDuotone.wallet, children: [
        const CustodyNote(),
        const SizedBox(height: 8),
        InfoRow(tr('Deal amount'), formatMoney(d.amount, d.currency), strong: true),
        if (p != null) ...[
          InfoRow(tr('Platform fee'), formatMoney(p.fee, p.currency)),
          InfoRow(partyText(isBuyer ? '{Payer} fee share' : '{Payee} fee share', d.dealType), formatMoney(isBuyer ? p.buyerShare : p.sellerShare, p.currency)),
          InfoRow(
            (isBuyer ? p.buyerVatRate : p.sellerVatRate) == 0
                ? tr('No VAT')
                : '${tr('VAT')} ${((isBuyer ? p.buyerVatRate : p.sellerVatRate) * 100).round()}%',
            formatMoney(isBuyer ? p.buyerVat : p.sellerVat, p.currency),
          ),
          if (!d.perMilestone)
            InfoRow(partyText(isBuyer ? '{Payer} pays' : '{Payee} receives', d.dealType),
                isBuyer ? formatMoney(p.buyerTotal, p.currency) : formatMoney(p.supplierNet, p.currency), strong: true),
          if (d.perMilestone)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(tr('This contract is funded milestone by milestone. Each milestone is paid at that day\'s exchange rate with its share of the fee; each funding gets its own tax invoice.'),
                  style: const TextStyle(fontSize: 12.5, color: InsightColors.muted)),
            ),
        ],
        InfoRow(tr('Fee paid by'), feePayerLabel(d.feePayer, d.dealType), ltr: false),
        InfoRow(tr('Inspection period'), trf('{n} day(s)', {'n': d.inspectionDays}), ltr: false),
        if (d.acceptanceCriteria != null && d.acceptanceCriteria!.isNotEmpty) InfoRow(tr('Acceptance criteria'), d.acceptanceCriteria!, ltr: false),
      ]),
      gap,
      if (b.milestones.isNotEmpty) ...[_milestones(b), gap],
      if (d.needsShipping) ...[_shipping(d), gap],
      // Invite link for the creator while the other party has not joined
      if (!d.bothJoined && d.inviteToken != null && d.createdBy == uid) ...[_invite(d), gap],
      // Actions
      SectionCard(title: tr('Deal actions'), icon: PhosphorIconsDuotone.lightning, children: [
        if (actions.isEmpty && b.milestones.every((m) => milestoneActions(d, m, uid).isEmpty))
          Text(tr('No action is needed from you right now.'), style: const TextStyle(color: InsightColors.muted)),
        if (actions.contains(DealAction.fund)) _funding(b),
        for (final a in actions.where((a) => a != DealAction.fund)) Padding(padding: const EdgeInsets.only(top: 8), child: _actionButton(d, a)),
      ]),
      gap,
      if (b.invoices.isNotEmpty) ...[_invoices(b), gap],
      if (b.transactions.isNotEmpty) ...[_money(b), gap],
      if (b.events.isNotEmpty) _timeline(b),
    ];
  }

  Widget _banner(String text, Color bg, Color fg) => Container(
        margin: const EdgeInsets.only(bottom: 14),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(10)),
        child: Text(text, style: TextStyle(color: fg, fontWeight: FontWeight.w500)),
      );

  Widget _funding(DealBundle b) {
    final d = b.deal;
    final q = _quote;
    final next = nextMilestoneToFund(d, b.milestones);
    final pay = _payCurrency ?? b.pricing?.payCurrency ?? 'SAR';
    if (q != null && !q.expired) {
      final m = q.milestone;
      return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        if (m != null) InfoRow(tr('Milestone'), '${m['seq']} · ${m['title']} · ${formatMoney((m['amount'] as num?) ?? 0, d.currency)}', ltr: false),
        InfoRow(tr(m != null ? 'Milestone amount (provider conversion + provider spread)' : 'Deal amount (provider conversion + provider spread)'),
            formatMoney(q.escrowConversion + q.fxSpread, q.targetCurrency)),
        InfoRow(partyText('{Payer} fee share', d.dealType), formatMoney(q.fee, q.targetCurrency)),
        InfoRow(q.buyerVatRate == 0 ? tr('No VAT') : '${tr('VAT')} ${(q.buyerVatRate * 100).round()}%', formatMoney(q.vat, q.targetCurrency)),
        const Divider(),
        InfoRow(tr('Total'), formatMoney(q.total, q.targetCurrency), strong: true),
        Text('${tr('Rate')}: 1 ${d.currency} = ${q.customerRate} ${q.targetCurrency} · ${tr('Rate locked until')} ${_time(q.expiresAt)}',
            style: const TextStyle(fontSize: 12, color: InsightColors.muted)),
        const SizedBox(height: 10),
        FilledButton.icon(
          icon: const PhosphorIcon(PhosphorIconsBold.lockSimple, size: 20),
          label: Text(next != null ? trf('Fund milestone {n}', {'n': next.seq}) : tr('Fund the deal')),
          onPressed: _busy ? null : () => _run('fund', {'dealId': d.id, 'quoteId': q.id}),
        ),
        TextButton(
          onPressed: _busy ? null : () => _run('fund', {'dealId': d.id, 'quoteId': q.id, 'simulateDecline': true}),
          child: Text(tr('Simulate a declined payment (demo)')),
        ),
      ]);
    }
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text(
        next != null
            ? trf('Next: fund milestone {n} ({amount}). Lock an exchange rate for 15 minutes before paying.', {'n': next.seq, 'amount': formatMoney(next.amount, d.currency)})
            : (q != null ? tr('Your exchange rate has expired. Please request a new quote.') : tr('Lock an exchange rate for 15 minutes before paying.')),
        style: const TextStyle(color: InsightColors.muted),
      ),
      const SizedBox(height: 10),
      Wrap(spacing: 10, runSpacing: 8, crossAxisAlignment: WrapCrossAlignment.center, children: [
        Text(tr('Pay in')),
        DropdownButton<String>(
          value: kPayCurrencies.contains(pay) ? pay : 'SAR',
          items: [for (final c in kPayCurrencies) DropdownMenuItem(value: c, child: Text(c))],
          onChanged: (v) => setState(() {
            _payCurrency = v;
            _quote = null;
          }),
        ),
        FilledButton(onPressed: _busy ? null : () => _getQuote(d, b.pricing), child: Text(tr('Get exchange-rate quote'))),
      ]),
    ]);
  }

  Widget _actionButton(Deal d, DealAction a) {
    switch (a) {
      case DealAction.acceptTerms:
        return FilledButton(onPressed: _busy ? null : () => _run('accept-terms', {'dealId': d.id}), child: Text(tr('Accept the terms')));
      case DealAction.requestTermsChange:
        return OutlinedButton(
          onPressed: _busy
              ? null
              : () async {
                  final note = await askText(context, title: tr('Request a change to the terms'), hint: tr('What should change?'));
                  if (note != null) await _run('request-terms-change', {'dealId': d.id, 'note': note});
                },
          child: Text(tr('Request a change')),
        );
      case DealAction.updateShipping:
        return OutlinedButton(
          onPressed: _busy
              ? null
              : () async {
                  final s = await askShipping(context, carrier: d.shippingCarrier, tracking: d.shippingTracking);
                  if (s != null) await _run('update-shipping', {'dealId': d.id, ...s});
                },
          child: Text(tr('Update shipping')),
        );
      case DealAction.confirmDelivery:
        return FilledButton(
          onPressed: _busy
              ? null
              : () async {
                  if (await confirm(context, tr('Confirm delivery?'), partyText('The {payer}\'s inspection period starts now.', d.dealType))) {
                    await _run('confirm-delivery', {'dealId': d.id});
                  }
                },
          child: Text(tr('Confirm delivery')),
        );
      case DealAction.requestRevision:
        return OutlinedButton(
          onPressed: _busy
              ? null
              : () async {
                  final note = await askText(context, title: tr('Ask for a revision'), hint: tr('What needs to be fixed?'));
                  if (note != null) await _run('request-revision', {'dealId': d.id, 'note': note});
                },
          child: Text(tr('Ask for a revision')),
        );
      case DealAction.release:
        return FilledButton(
          onPressed: _busy
              ? null
              : () async {
                  if (await confirm(context, tr('Release the funds?'), partyText('The payment provider pays the {payee}. This cannot be undone.', d.dealType))) {
                    await _run('release', {'dealId': d.id});
                  }
                },
          child: Text(tr('Confirm receipt and release the payment')),
        );
      case DealAction.openDispute:
        return TextButton.icon(
          icon: const PhosphorIcon(PhosphorIconsBold.warningCircle, color: InsightColors.danger, size: 20),
          label: Text(tr('Open a dispute'), style: const TextStyle(color: InsightColors.danger)),
          onPressed: _busy
              ? null
              : () async {
                  final r = await askDispute(context);
                  if (r != null) await _run('open-dispute', {'dealId': d.id, ...r});
                },
        );
      case DealAction.fund:
        return const SizedBox.shrink();
    }
  }

  Widget _milestones(DealBundle b) {
    final d = b.deal;
    final uid = currentUserId;
    return SectionCard(
      title: tr('Milestones'),
      icon: PhosphorIconsDuotone.flag,
      trailing: d.retentionPercent > 0 ? Text('${tr('Retention')} ${d.retentionPercent.toStringAsFixed(d.retentionPercent % 1 == 0 ? 0 : 1)}%', style: const TextStyle(fontSize: 12, color: InsightColors.muted)) : null,
      children: [
        for (final m in b.milestones)
          Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(border: Border.all(color: InsightColors.border), borderRadius: BorderRadius.circular(10)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Row(children: [
                Expanded(child: UserText('${m.seq}. ${m.title}', style: const TextStyle(fontWeight: FontWeight.w700))),
                StatusBadge(m.status, milestone: true),
              ]),
              const SizedBox(height: 4),
              Text(formatMoney(m.amount, d.currency), textDirection: TextDirection.ltr, style: const TextStyle(color: InsightColors.muted)),
              if (m.evidenceNote != null && m.evidenceNote!.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text('${tr('Evidence')}: ${m.evidenceNote}', style: const TextStyle(fontSize: 13)),
              ],
              if (m.status == 'revision_requested' && m.revisionNote != null) ...[
                const SizedBox(height: 6),
                Text('${tr('Revision requested')}: ${m.revisionNote}', style: const TextStyle(fontSize: 13, color: InsightColors.warning)),
              ],
              if (m.status == 'released')
                Text('${tr('Net released')} ${formatMoney(m.netReleased, d.currency)}', textDirection: TextDirection.ltr, style: const TextStyle(fontSize: 12.5, color: InsightColors.primary)),
              Wrap(spacing: 8, runSpacing: 4, children: [
                for (final a in milestoneActions(d, m, uid)) _milestoneButton(d, m, a),
              ]),
            ]),
          ),
      ],
    );
  }

  Widget _milestoneButton(Deal d, Milestone m, MilestoneAction a) {
    switch (a) {
      case MilestoneAction.submit:
        return FilledButton(
          onPressed: _busy
              ? null
              : () async {
                  final note = await askText(context, title: trf('Submit milestone {n}', {'n': m.seq}), hint: tr('Describe the completed work and the evidence.'));
                  if (note != null) await _run('submit-milestone', {'dealId': d.id, 'milestoneId': m.id, 'note': note});
                },
          child: Text(tr('Submit with evidence')),
        );
      case MilestoneAction.approve:
        return FilledButton(
          onPressed: _busy
              ? null
              : () async {
                  if (await confirm(context, trf('Approve milestone {n}?', {'n': m.seq}), partyText('The milestone amount less retention is released {payeeTo}.', d.dealType))) {
                    await _run('approve-milestone', {'dealId': d.id, 'milestoneId': m.id});
                  }
                },
          child: Text(tr('Approve and release')),
        );
      case MilestoneAction.requestRevision:
        return OutlinedButton(
          onPressed: _busy
              ? null
              : () async {
                  final note = await askText(context, title: tr('Ask for a revision'), hint: tr('What needs to be fixed?'));
                  if (note != null) await _run('milestone-revision', {'dealId': d.id, 'milestoneId': m.id, 'note': note});
                },
          child: Text(tr('Ask for a revision')),
        );
      case MilestoneAction.openDispute:
        return TextButton(
          onPressed: _busy
              ? null
              : () async {
                  final r = await askDispute(context);
                  if (r != null) await _run('open-dispute', {'dealId': d.id, 'milestoneId': m.id, ...r});
                },
          child: Text(tr('Open a dispute on this milestone'), style: const TextStyle(color: InsightColors.danger)),
        );
    }
  }

  Widget _shipping(Deal d) => SectionCard(title: tr('Shipping & delivery'), icon: PhosphorIconsDuotone.truck, children: [
        InfoRow(tr('Status'), tr(_shippingLabel(d.shippingStatus)), ltr: false),
        if (d.shippingCarrier != null) InfoRow(tr('Carrier'), d.shippingCarrier!),
        if (d.shippingTracking != null) InfoRow(tr('Tracking'), d.shippingTracking!),
      ]);

  Widget _invite(Deal d) {
    final link = '${AppConfig.siteUrl}/invite/${d.inviteToken}';
    return SectionCard(title: tr('Invite the other party'), icon: PhosphorIconsDuotone.linkSimple, children: [
      Text(tr('Share this link so the other party can review and accept the terms.'), style: const TextStyle(color: InsightColors.muted)),
      const SizedBox(height: 8),
      SelectableText(link, textDirection: TextDirection.ltr, style: const TextStyle(fontSize: 13)),
      const SizedBox(height: 8),
      OutlinedButton.icon(
        icon: const PhosphorIcon(PhosphorIconsBold.copy, size: 20),
        label: Text(tr('Copy link')),
        onPressed: () async {
          await Clipboard.setData(ClipboardData(text: link));
          if (mounted) showMessage(context, tr('Link copied.'));
        },
      ),
    ]);
  }

  Widget _invoices(DealBundle b) => SectionCard(
        title: b.invoices.length > 1 ? tr('Tax invoices') : tr('Tax invoice'),
        icon: PhosphorIconsDuotone.receipt,
        children: [
          for (final i in b.invoices)
            InfoRow(
              i.milestoneId == null ? i.number : '${i.number} · ${tr('Milestone')} ${b.milestones.where((m) => m.id == i.milestoneId).map((m) => m.seq).firstOrNull ?? ''}',
              '${formatMoney(i.fee, i.currency)} + ${i.vatRate == 0 ? tr('No VAT') : formatMoney(i.vat, i.currency)} = ${formatMoney(i.total, i.currency)}',
            ),
          TextButton(
            onPressed: () => launchUrl(Uri.parse('${AppConfig.siteUrl}/invoice/${b.deal.ref}'), mode: LaunchMode.externalApplication),
            child: Text(tr('Open printable invoice')),
          ),
        ],
      );

  Widget _money(DealBundle b) => SectionCard(title: tr('Money movements'), icon: PhosphorIconsDuotone.arrowsLeftRight, children: [
        for (final t in b.transactions)
          InfoRow(
            '${tr(_txLabel(t.kind))} · ${tr(_txStatus(t.status))}',
            formatMoney(t.amount, t.currency),
          ),
      ]);

  Widget _timeline(DealBundle b) => SectionCard(title: tr('Deal history'), icon: PhosphorIconsDuotone.clockCounterClockwise, children: [
        for (final e in b.events.take(15))
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Padding(padding: EdgeInsets.only(top: 5), child: PhosphorIcon(PhosphorIconsFill.circle, size: 9, color: InsightColors.brand1)),
              const SizedBox(width: 10),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(tr(e.title), style: const TextStyle(fontWeight: FontWeight.w500)),
                  if (e.note != null && e.note!.isNotEmpty && !e.note!.startsWith('[internal]'))
                    Text(e.note!, textDirection: dirFor(e.note!), style: const TextStyle(fontSize: 12.5, color: InsightColors.muted)),
                  Text(_date(e.createdAt), style: const TextStyle(fontSize: 11.5, color: InsightColors.muted)),
                ]),
              ),
            ]),
          ),
      ]);
}

String _shippingLabel(String? s) => switch (s) {
      'preparing' => 'Preparing',
      'shipped' => 'Shipped',
      'in_transit' => 'In transit',
      'out_for_delivery' => 'Out for delivery',
      'delivered' => 'Delivered',
      _ => 'Not required',
    };

String _txLabel(String k) => switch (k) { 'funding' => 'Funding', 'release' => 'Payout', 'refund' => 'Refund', _ => k };
String _txStatus(String s) => switch (s) {
      'succeeded' => 'Confirmed',
      'failed' => 'Failed',
      'processing' => 'Processing',
      'pending' => 'Pending',
      'cancelled' => 'Cancelled',
      _ => s,
    };

String _two(int n) => n.toString().padLeft(2, '0');
String _date(DateTime t) {
  final l = t.toLocal();
  return '${l.year}-${_two(l.month)}-${_two(l.day)} ${_two(l.hour)}:${_two(l.minute)}';
}

String _time(DateTime t) {
  final l = t.toLocal();
  return '${_two(l.hour)}:${_two(l.minute)}';
}
