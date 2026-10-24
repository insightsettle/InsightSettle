import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../api.dart';
import '../config.dart';
import '../l10n.dart';
import '../money.dart';
import '../theme.dart';
import '../widgets/common.dart';

const kDealCurrencies = ['SAR', 'BHD', 'AED', 'QAR', 'KWD', 'OMR', 'USD'];
const kCountries = {'SA': 'Saudi Arabia', 'BH': 'Bahrain', 'AE': 'United Arab Emirates', 'KW': 'Kuwait', 'QA': 'Qatar', 'OM': 'Oman'};
const kPayeeCountries = {...kCountries, 'OTHER': 'Outside the Gulf'};

class _MilestoneRow {
  final title = TextEditingController();
  final amount = TextEditingController();
}

/// Creates a goods or services deal (the website also offers contracting and freelance). Returns the deal reference.
class NewDealScreen extends StatefulWidget {
  const NewDealScreen({super.key});
  @override
  State<NewDealScreen> createState() => _NewDealScreenState();
}

class _NewDealScreenState extends State<NewDealScreen> {
  final _form = GlobalKey<FormState>();
  String _type = 'goods';
  String _role = 'seller';
  String _currency = 'SAR';
  String _feePayer = 'split';
  String _supplierCountry = 'SA';
  String _deliveryCountry = 'SA';
  bool _shipping = true;
  bool _useMilestones = false;
  String _fundingMode = 'upfront';
  int _inspection = 3;
  final _title = TextEditingController();
  final _description = TextEditingController();
  final _amount = TextEditingController();
  final _email = TextEditingController();
  final _acceptance = TextEditingController();
  final List<_MilestoneRow> _rows = [_MilestoneRow(), _MilestoneRow()];
  bool _busy = false;
  String? _error;

  String? _milestoneError(num total) {
    if (!_useMilestones || _type != 'services') return null;
    var sum = 0.0;
    for (final r in _rows) {
      final a = parseAmount(r.amount.text);
      if (r.title.text.trim().isEmpty || a == null || a <= 0) return tr('Every milestone needs a title and an amount.');
      if (!fitsMinorUnits(a, _currency)) return trf('Amounts can have at most {n} decimals.', {'n': minorUnitsFor(_currency)});
      sum += a;
    }
    if (roundMoney(sum, _currency) != roundMoney(total, _currency)) return tr('Milestone amounts must add up exactly to the deal amount.');
    return null;
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    final amount = parseAmount(_amount.text)!;
    final msError = _milestoneError(amount);
    if (msError != null) {
      setState(() => _error = msError);
      return;
    }
    final milestones = _useMilestones && _type == 'services'
        ? [for (final r in _rows) {'title': r.title.text.trim(), 'amount': parseAmount(r.amount.text)}]
        : <Map<String, dynamic>>[];
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final r = await api.action('create-deal', {
        'dealType': _type,
        'title': _title.text.trim(),
        'description': _description.text.trim(),
        'amount': amount,
        'currency': _currency,
        'role': _role,
        'counterpartyEmail': _email.text.trim(),
        'dueAt': null,
        'feePayer': _feePayer,
        'inspectionDays': _inspection,
        'shippingRequired': _type == 'goods' && _shipping,
        'quantity': 1,
        'supplierCountry': _supplierCountry,
        'deliveryCountry': _deliveryCountry,
        'shippingResponsibility': _type == 'goods' && _shipping ? 'seller' : 'none',
        'acceptanceCriteria': _acceptance.text.trim(),
        'refundConditions': '',
        'cancellationConditions': '',
        'autoRelease': true,
        'revisionsIncluded': 0,
        'retentionPercent': 0,
        'defectsLiabilityDays': 0,
        'fundingMode': milestones.isEmpty ? 'upfront' : _fundingMode,
        'milestones': milestones,
      });
      final map = (r as Map).cast<String, dynamic>();
      if (!mounted) return;
      final link = '${AppConfig.siteUrl}/invite/${map['invite_token']}';
      await showDialog<void>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text(tr('Deal created')),
          content: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Text(tr('Send this invitation link to the other party. They review and accept the terms before anything is paid.')),
            const SizedBox(height: 10),
            SelectableText(link, textDirection: TextDirection.ltr, style: const TextStyle(fontSize: 13)),
          ]),
          actions: [
            TextButton(
              onPressed: () async {
                await Clipboard.setData(ClipboardData(text: link));
                if (ctx.mounted) Navigator.pop(ctx);
              },
              child: Text(tr('Copy link')),
            ),
            FilledButton(onPressed: () => Navigator.pop(ctx), child: Text(tr('Open the deal'))),
          ],
        ),
      );
      if (mounted) Navigator.of(context).pop(map['ref'] as String);
    } on ApiException catch (e) {
      setState(() => _error = tr(e.message));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Widget _dropdown<T>(String label, T value, Map<T, String> items, ValueChanged<T> onChanged, {bool localized = false}) => DropdownButtonFormField<T>(
        initialValue: value,
        decoration: InputDecoration(labelText: label),
        isExpanded: true,
        items: [for (final e in items.entries) DropdownMenuItem(value: e.key, child: Text(localized ? e.value : tr(e.value)))],
        onChanged: (v) {
          if (v != null) setState(() => onChanged(v));
        },
      );

  @override
  Widget build(BuildContext context) {
    const gap = SizedBox(height: 12);
    return Scaffold(
      appBar: AppBar(title: Text(tr('New deal'))),
      body: Form(
        key: _form,
        child: ListView(padding: const EdgeInsets.all(16), children: [
          SegmentedButton<String>(
            segments: [
              ButtonSegment(value: 'goods', label: Text(tr('Goods')), icon: const Icon(Icons.inventory_2_outlined)),
              ButtonSegment(value: 'services', label: Text(tr('Services')), icon: const Icon(Icons.design_services_outlined)),
            ],
            selected: {_type},
            onSelectionChanged: (s) => setState(() {
              _type = s.first;
              _inspection = _type == 'goods' ? 3 : 5;
            }),
          ),
          const SizedBox(height: 6),
          Text(tr('Contracting and freelance deals are created on the website.'), style: const TextStyle(fontSize: 12, color: InsightColors.muted)),
          gap,
          _dropdown<String>(tr('Your side'), _role, {'seller': partyText('I am the {payee}', _type), 'buyer': partyText('I am the {payer}', _type)}, (v) => _role = v, localized: true),
          gap,
          TextFormField(
            controller: _title,
            decoration: InputDecoration(labelText: tr('Deal title')),
            validator: (v) => (v ?? '').trim().length < 3 ? tr('Use at least 3 characters.') : null,
          ),
          gap,
          TextFormField(controller: _description, minLines: 2, maxLines: 5, decoration: InputDecoration(labelText: tr('Description'))),
          gap,
          Row(children: [
            Expanded(
              flex: 3,
              child: TextFormField(
                controller: _amount,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                textDirection: TextDirection.ltr,
                decoration: InputDecoration(labelText: tr('Amount')),
                validator: (v) {
                  final a = parseAmount(v ?? '');
                  if (a == null || a <= 0) return tr('Enter an amount above zero.');
                  if (!fitsMinorUnits(a, _currency)) return trf('Amounts can have at most {n} decimals.', {'n': minorUnitsFor(_currency)});
                  return null;
                },
              ),
            ),
            const SizedBox(width: 10),
            Expanded(flex: 2, child: _dropdown<String>(tr('Currency'), _currency, {for (final c in kDealCurrencies) c: c}, (v) => _currency = v)),
          ]),
          gap,
          _dropdown<String>(tr('Fee paid by'), _feePayer, {for (final v in ['split', 'buyer', 'seller']) v: feePayerLabel(v, _type)}, (v) => _feePayer = v, localized: true),
          gap,
          Row(children: [
            Expanded(child: _dropdown<String>(partyText('{Payee} country', _type), _supplierCountry, kPayeeCountries, (v) => _supplierCountry = v)),
            const SizedBox(width: 10),
            Expanded(child: _dropdown<String>(partyText('{Payer} country', _type), _deliveryCountry, kCountries, (v) => _deliveryCountry = v)),
          ]),
          gap,
          _dropdown<int>(tr('Inspection period'), _inspection, {for (final n in [1, 2, 3, 5, 7, 10, 14]) n: trf('{n} day(s)', {'n': n})}, (v) => _inspection = v),
          gap,
          TextFormField(controller: _acceptance, minLines: 2, maxLines: 4, decoration: InputDecoration(labelText: tr('Acceptance criteria'))),
          gap,
          TextFormField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            textDirection: TextDirection.ltr,
            decoration: InputDecoration(labelText: tr('Other party email (optional)')),
            validator: (v) {
              final s = (v ?? '').trim();
              if (s.isEmpty) return null;
              return RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(s) ? null : tr('Enter a valid email.');
            },
          ),
          if (_type == 'goods')
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(tr('Shipping needed')),
              subtitle: Text(partyText('The {payee} ships and adds the tracking number.', _type)),
              value: _shipping,
              onChanged: (v) => setState(() => _shipping = v),
            ),
          if (_type == 'services') ...[
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(tr('Pay in milestones')),
              subtitle: Text(tr('Split the deal into 2–20 milestones released one by one.')),
              value: _useMilestones,
              onChanged: (v) => setState(() => _useMilestones = v),
            ),
            if (_useMilestones) ...[
              for (var i = 0; i < _rows.length; i++)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(children: [
                    Expanded(flex: 3, child: TextField(controller: _rows[i].title, decoration: InputDecoration(labelText: trf('Milestone {n}', {'n': i + 1})))),
                    const SizedBox(width: 8),
                    Expanded(
                      flex: 2,
                      child: TextField(
                        controller: _rows[i].amount,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        textDirection: TextDirection.ltr,
                        decoration: InputDecoration(labelText: tr('Amount')),
                      ),
                    ),
                    IconButton(
                      tooltip: tr('Remove milestone'),
                      onPressed: _rows.length <= 2 ? null : () => setState(() => _rows.removeAt(i)),
                      icon: const Icon(Icons.delete_outline),
                    ),
                  ]),
                ),
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: TextButton.icon(
                  onPressed: _rows.length >= 20 ? null : () => setState(() => _rows.add(_MilestoneRow())),
                  icon: const Icon(Icons.add),
                  label: Text(tr('Add milestone')),
                ),
              ),
              _dropdown<String>(tr('Funding'), _fundingMode, {'upfront': 'Fund all upfront', 'per_milestone': 'Fund each milestone when it starts'}, (v) => _fundingMode = v),
            ],
          ],
          if (_error != null) ...[gap, Text(_error!, style: const TextStyle(color: InsightColors.danger))],
          const SizedBox(height: 20),
          FilledButton(onPressed: _busy ? null : _submit, child: Text(_busy ? tr('Please wait…') : tr('Create deal and get invite link'))),
          const SizedBox(height: 12),
          const CustodyNote(),
        ]),
      ),
    );
  }
}
