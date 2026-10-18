import 'package:flutter/material.dart';

import '../l10n.dart';

Future<bool> confirm(BuildContext context, String title, String body) async {
  final r = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(title),
      content: Text(body),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(tr('Cancel'))),
        FilledButton(onPressed: () => Navigator.pop(ctx, true), child: Text(tr('Confirm'))),
      ],
    ),
  );
  return r == true;
}

/// Asks for a note of at least [minLength] characters (the server's own minimum).
Future<String?> askText(BuildContext context, {required String title, required String hint, int minLength = 3}) {
  final c = TextEditingController();
  return showDialog<String>(
    context: context,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setState) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: c,
          autofocus: true,
          minLines: 3,
          maxLines: 6,
          decoration: InputDecoration(hintText: hint),
          onChanged: (_) => setState(() {}),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(tr('Cancel'))),
          FilledButton(
            onPressed: c.text.trim().length < minLength ? null : () => Navigator.pop(ctx, c.text.trim()),
            child: Text(tr('Send')),
          ),
        ],
      ),
    ),
  );
}

const kDisputeReasons = {
  'not_received': 'Not received',
  'wrong_item': 'Wrong item',
  'damaged': 'Damaged',
  'quantity_mismatch': 'Quantity does not match',
  'quality_issue': 'Quality issue',
  'late_delivery': 'Late delivery',
  'other': 'Other',
};

Future<Map<String, dynamic>?> askDispute(BuildContext context) {
  final details = TextEditingController();
  var reason = 'quality_issue';
  return showDialog<Map<String, dynamic>>(
    context: context,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setState) => AlertDialog(
        title: Text(tr('Open a dispute')),
        content: SingleChildScrollView(
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Text(tr('The funds stay frozen with the payment provider while Insight reviews the case. A written, reasoned decision is approved by a second staff member; either party keeps the right to go to court.'),
                style: const TextStyle(fontSize: 12.5)),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: reason,
              decoration: InputDecoration(labelText: tr('Reason')),
              items: [for (final e in kDisputeReasons.entries) DropdownMenuItem(value: e.key, child: Text(tr(e.value)))],
              onChanged: (v) => setState(() => reason = v ?? reason),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: details,
              minLines: 3,
              maxLines: 6,
              decoration: InputDecoration(hintText: tr('Explain the problem (at least 10 characters).')),
              onChanged: (_) => setState(() {}),
            ),
          ]),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(tr('Cancel'))),
          FilledButton(
            onPressed: details.text.trim().length < 10 ? null : () => Navigator.pop(ctx, {'reason': reason, 'details': details.text.trim()}),
            child: Text(tr('Open dispute')),
          ),
        ],
      ),
    ),
  );
}

Future<Map<String, dynamic>?> askShipping(BuildContext context, {String? carrier, String? tracking}) {
  final c = TextEditingController(text: carrier ?? '');
  final t = TextEditingController(text: tracking ?? '');
  var status = 'shipped';
  const statuses = {'preparing': 'Preparing', 'shipped': 'Shipped', 'in_transit': 'In transit', 'out_for_delivery': 'Out for delivery'};
  return showDialog<Map<String, dynamic>>(
    context: context,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setState) => AlertDialog(
        title: Text(tr('Update shipping')),
        content: SingleChildScrollView(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(controller: c, decoration: InputDecoration(labelText: tr('Carrier'))),
            const SizedBox(height: 10),
            TextField(controller: t, textDirection: TextDirection.ltr, decoration: InputDecoration(labelText: tr('Tracking number'))),
            const SizedBox(height: 10),
            DropdownButtonFormField<String>(
              initialValue: status,
              decoration: InputDecoration(labelText: tr('Status')),
              items: [for (final e in statuses.entries) DropdownMenuItem(value: e.key, child: Text(tr(e.value)))],
              onChanged: (v) => setState(() => status = v ?? status),
            ),
          ]),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(tr('Cancel'))),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, {'carrier': c.text.trim(), 'tracking': t.text.trim(), 'status': status}),
            child: Text(tr('Save')),
          ),
        ],
      ),
    ),
  );
}
