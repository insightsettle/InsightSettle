import 'package:flutter/material.dart';

import '../api.dart';
import '../deal_rules.dart';
import '../l10n.dart';
import '../models.dart';
import '../money.dart';
import '../theme.dart';
import '../widgets/common.dart';
import 'account.dart';
import 'deal_detail.dart';
import 'join_deal.dart';
import 'new_deal.dart';
import 'notifications.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});
  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _tab = 0;
  final _dealsKey = GlobalKey<DealsScreenState>();

  @override
  Widget build(BuildContext context) {
    final pages = [DealsScreen(key: _dealsKey), const NotificationsScreen(), const AccountScreen()];
    return Scaffold(
      appBar: AppBar(
        title: const BrandLogo(height: 30),
        actions: [
          if (_tab == 0)
            IconButton(
              tooltip: tr('Join a deal'),
              icon: const Icon(Icons.link),
              onPressed: () async {
                final ref = await Navigator.of(context).push<String>(MaterialPageRoute(builder: (_) => const JoinDealScreen()));
                if (ref != null && context.mounted) {
                  await Navigator.of(context).push(MaterialPageRoute(builder: (_) => DealDetailScreen(dealRef: ref)));
                }
                _dealsKey.currentState?.reload();
              },
            ),
        ],
      ),
      body: IndexedStack(index: _tab, children: pages),
      floatingActionButton: _tab == 0
          ? FloatingActionButton.extended(
              backgroundColor: InsightColors.primary,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.add),
              label: Text(tr('New deal')),
              onPressed: () async {
                final ref = await Navigator.of(context).push<String>(MaterialPageRoute(builder: (_) => const NewDealScreen()));
                if (ref != null && context.mounted) {
                  await Navigator.of(context).push(MaterialPageRoute(builder: (_) => DealDetailScreen(dealRef: ref)));
                }
                _dealsKey.currentState?.reload();
              },
            )
          : null,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (i) => setState(() => _tab = i),
        destinations: [
          NavigationDestination(icon: const Icon(Icons.handshake_outlined), selectedIcon: const Icon(Icons.handshake), label: tr('Deals')),
          NavigationDestination(icon: const Icon(Icons.notifications_none), selectedIcon: const Icon(Icons.notifications), label: tr('Notifications')),
          NavigationDestination(icon: const Icon(Icons.person_outline), selectedIcon: const Icon(Icons.person), label: tr('Account')),
        ],
      ),
    );
  }
}

class DealsScreen extends StatefulWidget {
  const DealsScreen({super.key});
  @override
  State<DealsScreen> createState() => DealsScreenState();
}

class DealsScreenState extends State<DealsScreen> {
  late Future<(List<Deal>, Map<String, List<Milestone>>)> _future = _load();

  Future<(List<Deal>, Map<String, List<Milestone>>)> _load() async {
    final deals = await api.listDeals();
    final ms = await api.milestonesFor(deals.map((d) => d.id).toList());
    return (deals, ms);
  }

  void reload() => setState(() => _future = _load());

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<(List<Deal>, Map<String, List<Milestone>>)>(
      future: _future,
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) return const Center(child: CircularProgressIndicator());
        if (snap.hasError) return ErrorView(message: tr('The deals could not be loaded.'), onRetry: reload);
        final (deals, ms) = snap.data!;
        final uid = currentUserId;
        final action = deals.where((d) => needsMyAction(d, ms[d.id] ?? const [], uid)).toList();
        final open = deals.where((d) => !isClosed(d) && !action.contains(d)).toList();
        final closed = deals.where(isClosed).toList();
        return RefreshIndicator(
          onRefresh: () async => reload(),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
            children: [
              const CustodyNote(),
              const SizedBox(height: 16),
              if (deals.isEmpty) _empty(context),
              if (action.isNotEmpty) ..._section(tr('Needs your action'), action, ms, highlight: true),
              if (open.isNotEmpty) ..._section(tr('Active deals'), open, ms),
              if (closed.isNotEmpty) ..._section(tr('Closed deals'), closed, ms),
            ],
          ),
        );
      },
    );
  }

  Widget _empty(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 48),
        child: Column(children: [
          const Icon(Icons.handshake_outlined, size: 48, color: InsightColors.muted),
          const SizedBox(height: 12),
          Text(tr('No deals yet'), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          Text(tr('Create a deal or join one with the invitation link you received.'),
              textAlign: TextAlign.center, style: const TextStyle(color: InsightColors.muted)),
        ]),
      );

  List<Widget> _section(String title, List<Deal> deals, Map<String, List<Milestone>> ms, {bool highlight = false}) => [
        Padding(
          padding: const EdgeInsets.only(bottom: 8, top: 4),
          child: Text(title, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: highlight ? InsightColors.primary : InsightColors.ink)),
        ),
        for (final d in deals) ...[
          DealCard(
            deal: d,
            next: nextStep(d, ms[d.id] ?? const [], currentUserId),
            onTap: () async {
              await Navigator.of(context).push(MaterialPageRoute(builder: (_) => DealDetailScreen(dealRef: d.ref)));
              reload();
            },
          ),
          const SizedBox(height: 10),
        ],
        const SizedBox(height: 8),
      ];
}

class DealCard extends StatelessWidget {
  const DealCard({super.key, required this.deal, required this.next, required this.onTap});
  final Deal deal;
  final String? next;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isBuyer = deal.buyerId == currentUserId;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(child: UserText(deal.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15))),
              const SizedBox(width: 8),
              StatusBadge(deal.status),
            ]),
            const SizedBox(height: 6),
            Text('${deal.ref} · ${dealTypeLabel(deal.dealType)} · ${partyText(isBuyer ? 'You are the {payer}' : 'You are the {payee}', deal.dealType)}',
                style: const TextStyle(color: InsightColors.muted, fontSize: 12.5)),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(
                child: next == null
                    ? const SizedBox.shrink()
                    : Text(partyText(next!, deal.dealType), style: const TextStyle(color: InsightColors.primary, fontSize: 13, fontWeight: FontWeight.w500)),
              ),
              Text(formatMoney(deal.amount, deal.currency), textDirection: TextDirection.ltr, style: const TextStyle(fontWeight: FontWeight.w700)),
            ]),
          ]),
        ),
      ),
    );
  }
}
