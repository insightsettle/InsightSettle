import 'package:flutter/material.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../api.dart';
import '../l10n.dart';
import '../models.dart';
import '../theme.dart';
import '../widgets/common.dart';
import '../widgets/illustrations.dart';
import 'deal_detail.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});
  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  late Future<List<AppNotification>> _future = api.notifications();
  void _reload() => setState(() => _future = api.notifications());

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<AppNotification>>(
      future: _future,
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) return const Center(child: CircularProgressIndicator());
        if (snap.hasError) return ErrorView(message: tr('The notifications could not be loaded.'), onRetry: _reload);
        final list = snap.data!;
        return RefreshIndicator(
          onRefresh: () async => _reload(),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Row(children: [
                Expanded(child: Text(tr('Notifications'), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700))),
                if (list.any((n) => !n.read))
                  TextButton(
                    onPressed: () async {
                      await api.markAllRead();
                      _reload();
                    },
                    child: Text(tr('Mark all as read')),
                  ),
              ]),
              const SizedBox(height: 8),
              if (list.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 24),
                  child: Column(children: [
                    const Illustration(Ill.calm, width: 200),
                    const SizedBox(height: 8),
                    Text(tr('No notifications yet.'), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 4),
                    Text(tr('We will tell you here the moment your deal moves.'), textAlign: TextAlign.center, style: const TextStyle(color: InsightColors.muted)),
                  ]),
                ),
              for (final n in list)
                Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(color: n.read ? InsightColors.background : InsightColors.primarySubtle, borderRadius: BorderRadius.circular(12)),
                      child: Center(child: PhosphorIcon(n.read ? PhosphorIconsDuotone.bellSimple : PhosphorIconsDuotone.bellRinging, size: 21, color: n.read ? InsightColors.muted : InsightColors.primary, duotoneSecondaryOpacity: 0.3)),
                    ),
                    title: Text(tr(n.title), style: TextStyle(fontWeight: n.read ? FontWeight.w400 : FontWeight.w700)),
                    subtitle: n.body == null ? null : Text(tr(n.body!)),
                    trailing: Text(_ago(n.createdAt), style: const TextStyle(fontSize: 11, color: InsightColors.muted)),
                    onTap: n.dealId == null
                        ? null
                        : () async {
                            final ref = await api.dealRefById(n.dealId!);
                            if (ref != null && context.mounted) {
                              await Navigator.of(context).push(MaterialPageRoute(builder: (_) => DealDetailScreen(dealRef: ref)));
                            }
                          },
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

String _ago(DateTime t) {
  final d = DateTime.now().difference(t.toLocal());
  if (d.inMinutes < 1) return tr('now');
  if (d.inHours < 1) return trf('{n} min', {'n': d.inMinutes});
  if (d.inDays < 1) return trf('{n} h', {'n': d.inHours});
  return trf('{n} d', {'n': d.inDays});
}
