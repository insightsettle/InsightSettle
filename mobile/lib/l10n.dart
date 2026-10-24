import 'package:flutter/widgets.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'l10n_ar.dart';
import 'roles.dart';

/// App language: Arabic by default (as on the website), English on request.
class AppLocale {
  static final notifier = ValueNotifier<Locale>(const Locale('ar'));
  static const _key = 'insight.locale';

  static bool get isArabic => notifier.value.languageCode == 'ar';

  static Future<void> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final code = prefs.getString(_key);
      if (code == 'en' || code == 'ar') notifier.value = Locale(code!);
    } catch (_) {
      // Preference storage unavailable: keep the default.
    }
  }

  static Future<void> set(String code) async {
    notifier.value = Locale(code);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_key, code);
    } catch (_) {}
  }
}

/// Translates an English UI string. Missing entries fall back to English.
String tr(String en) => AppLocale.isArabic ? (kArabic[en] ?? en) : en;

/// Translates a template with {placeholders}.
String trf(String en, Map<String, Object> values) {
  var s = tr(en);
  values.forEach((k, v) => s = s.replaceAll('{$k}', v.toString()));
  return s;
}

/// Localized contextual names in UI templates; never used for API values.
String partyText(String en, String? dealType) {
  final roles = rolesFor(dealType);
  final ar = AppLocale.isArabic;
  return trf(en, {
    'payer': ar ? roles.payer.ar : roles.payer.en,
    'Payer': ar ? roles.payer.ar : roles.payer.capitalized,
    'payee': ar ? roles.payee.ar : roles.payee.en,
    'Payee': ar ? roles.payee.ar : roles.payee.capitalized,
    'payeeTo': ar ? roles.payee.arabicTo : 'to the ${roles.payee.en}',
  });
}

String feePayerLabel(String? feePayer, String? dealType) => partyText(
      switch (feePayer) {
        'seller' => '{Payee} pays the fee',
        'split' => 'Split half and half',
        _ => '{Payer} pays the fee',
      },
      dealType,
    );

const Map<String, String> kStatusEn = {
  'pending_funding': 'Pending funding',
  'held': 'Paid into the deal',
  'delivered': 'Delivered',
  'under_review': 'Under review',
  'released': 'Released',
  'refunded': 'Refunded',
  'disputed': 'Disputed',
  'in_progress': 'In progress',
  'completed': 'Completed',
  'cancelled': 'Cancelled',
  'rejected': 'Rejected',
  'partially_refunded': 'Partially refunded',
};

const Map<String, String> kMilestoneStatusEn = {
  'pending': 'Not funded',
  'funded': 'Funded',
  'submitted': 'Submitted',
  'revision_requested': 'Revision requested',
  'disputed': 'Disputed',
  'released': 'Released',
  'refunded': 'Refunded',
};

const Map<String, String> kDealTypeEn = {
  'goods': 'Goods',
  'services': 'Services',
  'contracting': 'Contracting & fit-out',
  'freelance': 'Freelance & digital work',
  'auction': 'Auction lot',
};

String statusLabel(String s) => tr(kStatusEn[s] ?? s);
String milestoneStatusLabel(String s) => tr(kMilestoneStatusEn[s] ?? s);
String dealTypeLabel(String s) => tr(kDealTypeEn[s] ?? s);
