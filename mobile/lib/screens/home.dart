import 'package:flutter/material.dart';

import '../api.dart';
import '../deal_rules.dart';
import '../l10n.dart';
import '../models.dart';
import '../money.dart';
import '../theme.dart';
import '../widgets/common.dart';
import '../widgets/illustrations.dart';
import '../widgets/journey.dart';
import '../widgets/phosphor.dart';
import 'account.dart';
import 'deal_detail.dart';
import 'join_deal.dart';
import 'new_deal.dart';
import 'notifications.dart';
import 'welcome.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});
  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _tab = 0;
  final _dealsKey = GlobalKey<DealsScreenState>();

  @override
  void initState() {
    super.initState();
    // The story is shown once, after the first sign-in on this device.
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (await welcomeSeen()) return;
      if (!mounted) return;
      final choice = await Navigator.of(context).push<WelcomeChoice>(
        PageRouteBuilder(
          fullscreenDialog: true,
          transitionDuration: const Duration(milliseconds: 380),
          pageBuilder: (_, __, ___) => const WelcomeScreen(),
          transitionsBuilder: (_, a, __, child) => FadeTransition(opacity: a, child: child),
        ),
      );
      await markWelcomeSeen();
      if (choice == WelcomeChoice.newDeal && mounted) await _newDeal();
    });
  }

  Future<void> _newDeal() async {
    final ref = await Navigator.of(context).push<String>(MaterialPageRoute(builder: (_) => const NewDealScreen()));
    if (ref != null && mounted) {
      await Navigator.of(context).push(MaterialPageRoute(builder: (_) => DealDetailScreen(dealRef: ref)));
    }
    _dealsKey.currentState?.reload();
  }

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
              icon: const PhosphorIcon(PhosphorIconsBold.linkSimple),
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
              icon: const PhosphorIcon(PhosphorIconsBold.plus),
              label: Text(tr('New deal')),
              onPressed: _newDeal,
            )
          : null,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (i) => setState(() => _tab = i),
        destinations: [
          NavigationDestination(icon: const PhosphorIcon(PhosphorIconsRegular.handshake), selectedIcon: const PhosphorIcon(PhosphorIconsDuotone.handshake, duotoneSecondaryOpacity: 0.3), label: tr('Deals')),
          NavigationDestination(icon: const PhosphorIcon(PhosphorIconsRegular.bell), selectedIcon: const PhosphorIcon(PhosphorIconsDuotone.bell, duotoneSecondaryOpacity: 0.3), label: tr('Notifications')),
          NavigationDestination(icon: const PhosphorIcon(PhosphorIconsRegular.userCircle), selectedIcon: const PhosphorIcon(PhosphorIconsDuotone.userCircle, duotoneSecondaryOpacity: 0.3), label: tr('Account')),
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
        if (snap.connectionState != ConnectionState.done) return const Padding(padding: EdgeInsets.all(16), child: ListSkeleton());
        if (snap.hasError) return ErrorView(message: tr('The deals could not be loaded.'), onRetry: reload);
        final (deals, ms) = snap.data!;
        final uid = currentUserId;
        final action = deals.where((d) => needsMyAction(d, ms[d.id] ?? const [], uid)).toList();
        final open = deals.where((d) => !isClosed(d) && !action.contains(d)).toList();
        final closed = deals.where(isClosed).toList();
        var n = 0; // order of appearance, for the staggered entrance
        Widget enter(Widget child) => Appear(index: n++, child: child);
        return RefreshIndicator(
          onRefresh: () async => reload(),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
            children: [
              enter(const CustodyNote()),
              const SizedBox(height: 16),
              if (deals.isEmpty) enter(_empty(context)),
              if (action.isNotEmpty) ..._section(tr('Needs your action'), action, ms, enter, highlight: true),
              if (open.isNotEmpty) ..._section(tr('Active deals'), open, ms, enter),
              if (closed.isNotEmpty) ..._section(tr('Closed deals'), closed, ms, enter),
            ],
          ),
        );
      },
    );
  }

  Widget _empty(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 24),
        child: Column(children: [
          const Illustration(Ill.empty, width: 220),
          const SizedBox(height: 8),
          Text(tr('No deals yet'), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          Text(tr('Create a deal or join one with the invitation link you received.'),
              textAlign: TextAlign.center, style: const TextStyle(color: InsightColors.muted)),
        ]),
      );

  List<Widget> _section(String title, List<Deal> deals, Map<String, List<Milestone>> ms, Widget Function(Widget) enter, {bool highlight = false}) => [
        enter(Padding(
          padding: const EdgeInsets.only(bottom: 8, top: 4),
          child: Row(children: [
            if (highlight) ...[const PhosphorIcon(PhosphorIconsDuotone.bellRinging, size: 18, color: InsightColors.primary), const SizedBox(width: 6)],
            Text(title, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: highlight ? InsightColors.primary : InsightColors.ink)),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 1),
              decoration: BoxDecoration(color: highlight ? InsightColors.primary : InsightColors.border, borderRadius: BorderRadius.circular(99)),
              child: Text('${deals.length}', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: highlight ? Colors.white : InsightColors.muted)),
            ),
          ]),
        )),
        for (final d in deals) ...[
          enter(DealCard(
            deal: d,
            next: nextStep(d, ms[d.id] ?? const [], currentUserId),
            onTap: () async {
              await Navigator.of(context).push(MaterialPageRoute(builder: (_) => DealDetailScreen(dealRef: d.ref)));
              reload();
            },
          )),
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
    return Pressable(
      onTap: onTap,
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(color: InsightColors.primarySubtle, borderRadius: BorderRadius.circular(12)),
                child: Center(child: PhosphorIcon(dealTypeIcon(deal.dealType), size: 22, color: InsightColors.primary, duotoneSecondaryOpacity: 0.3)),
              ),
              const SizedBox(width: 10),
              Expanded(child: UserText(deal.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15))),
              const SizedBox(width: 8),
              StatusBadge(deal.status),
            ]),
            const SizedBox(height: 8),
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
            const SizedBox(height: 10),
            MiniJourney(deal: deal),
          ]),
        ),
      ),
    );
  }
}
