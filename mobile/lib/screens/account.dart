import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api.dart';
import '../config.dart';
import '../l10n.dart';
import '../theme.dart';
import '../widgets/phosphor.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen({super.key});
  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  late final Future<Map<String, dynamic>?> _profile = api.myProfile();

  void _open(String path) => launchUrl(Uri.parse('${AppConfig.siteUrl}$path'), mode: LaunchMode.externalApplication);

  @override
  Widget build(BuildContext context) {
    final email = sb.auth.currentUser?.email ?? '';
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        FutureBuilder<Map<String, dynamic>?>(
          future: _profile,
          builder: (context, snap) {
            final p = snap.data;
            final verified = p?['verification_status'] == 'verified';
            return Card(
              child: ListTile(
                leading: const CircleAvatar(backgroundColor: InsightColors.primarySubtle, child: PhosphorIcon(PhosphorIconsDuotone.user, color: InsightColors.primary, duotoneSecondaryOpacity: 0.3)),
                title: Text((p?['full_name'] as String?)?.isNotEmpty == true ? p!['full_name'] as String : email),
                subtitle: Text(email, textDirection: TextDirection.ltr),
                trailing: Text(verified ? tr('Verified') : tr('Not verified yet'),
                    style: TextStyle(color: verified ? InsightColors.primary : InsightColors.warning, fontSize: 12)),
              ),
            );
          },
        ),
        const SizedBox(height: 12),
        Card(
          child: Column(children: [
            ListTile(
              leading: const PhosphorIcon(PhosphorIconsDuotone.translate, color: InsightColors.primary),
              title: Text(tr('Language')),
              trailing: SegmentedButton<String>(
                segments: const [ButtonSegment(value: 'ar', label: Text('العربية')), ButtonSegment(value: 'en', label: Text('English'))],
                selected: {AppLocale.isArabic ? 'ar' : 'en'},
                onSelectionChanged: (s) => AppLocale.set(s.first),
              ),
            ),
            const Divider(),
            ListTile(
              leading: const PhosphorIcon(PhosphorIconsDuotone.identificationCard, color: InsightColors.primary),
              title: Text(tr('Identity and payout account')),
              subtitle: Text(tr('Managed on the website')),
              trailing: const PhosphorIcon(PhosphorIconsBold.arrowSquareOut, size: 18, color: InsightColors.muted),
              onTap: () => _open('/verification'),
            ),
            ListTile(
              leading: const PhosphorIcon(PhosphorIconsDuotone.question, color: InsightColors.primary),
              title: Text(tr('Help')),
              trailing: const PhosphorIcon(PhosphorIconsBold.arrowSquareOut, size: 18, color: InsightColors.muted),
              onTap: () => _open('/help'),
            ),
            ListTile(
              leading: const PhosphorIcon(PhosphorIconsDuotone.fileText, color: InsightColors.primary),
              title: Text(tr('Terms of service')),
              trailing: const PhosphorIcon(PhosphorIconsBold.arrowSquareOut, size: 18, color: InsightColors.muted),
              onTap: () => _open('/terms'),
            ),
            ListTile(
              leading: const PhosphorIcon(PhosphorIconsDuotone.shieldCheck, color: InsightColors.primary),
              title: Text(tr('Privacy policy')),
              trailing: const PhosphorIcon(PhosphorIconsBold.arrowSquareOut, size: 18, color: InsightColors.muted),
              onTap: () => _open('/privacy'),
            ),
          ]),
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          icon: const PhosphorIcon(PhosphorIconsBold.signOut, color: InsightColors.danger, size: 20),
          label: Text(tr('Sign out'), style: const TextStyle(color: InsightColors.danger)),
          onPressed: () => sb.auth.signOut(),
        ),
        const SizedBox(height: 24),
        Center(child: Text('Insight 1.0.0', style: const TextStyle(color: InsightColors.muted, fontSize: 12))),
      ],
    );
  }
}
