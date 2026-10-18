import 'package:flutter/material.dart';

import '../api.dart';
import '../deal_rules.dart';
import '../l10n.dart';
import '../theme.dart';
import '../widgets/common.dart';

/// Joins a deal from the invitation link (or its code). Returns the deal reference.
class JoinDealScreen extends StatefulWidget {
  const JoinDealScreen({super.key});
  @override
  State<JoinDealScreen> createState() => _JoinDealScreenState();
}

class _JoinDealScreenState extends State<JoinDealScreen> {
  final _link = TextEditingController();
  bool _busy = false;
  String? _error;

  Future<void> _join() async {
    final token = inviteTokenFrom(_link.text);
    if (token == null) {
      setState(() => _error = tr('Paste the full invitation link you received.'));
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final r = await api.action('join-deal', {'token': token});
      final map = (r as Map).cast<String, dynamic>();
      if (map['ok'] == true && map['ref'] is String) {
        if (mounted) Navigator.of(context).pop(map['ref'] as String);
        return;
      }
      setState(() => _error = switch (map['reason']) {
            'already_joined' => tr('Another account has already joined this deal.'),
            'not_found' => tr('This invitation link is not valid.'),
            _ => tr('This invitation could not be accepted.'),
          });
    } on ApiException catch (e) {
      setState(() => _error = tr(e.message));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(tr('Join a deal'))),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        Text(tr('Paste the invitation link the other party sent you. You will see the terms before anything is paid.'),
            style: const TextStyle(color: InsightColors.muted)),
        const SizedBox(height: 16),
        TextField(
          controller: _link,
          textDirection: TextDirection.ltr,
          decoration: const InputDecoration(hintText: 'https://insightsettle.com/invite/…'),
        ),
        if (_error != null) ...[const SizedBox(height: 10), Text(_error!, style: const TextStyle(color: InsightColors.danger))],
        const SizedBox(height: 16),
        FilledButton(onPressed: _busy ? null : _join, child: Text(_busy ? tr('Please wait…') : tr('Join the deal'))),
        const SizedBox(height: 16),
        const CustodyNote(),
      ]),
    );
  }
}
