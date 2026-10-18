double _num(dynamic v) => v == null ? 0 : (v is num ? v.toDouble() : double.tryParse(v.toString()) ?? 0);
String? _str(dynamic v) => v?.toString();

class Deal {
  Deal(this.raw);
  final Map<String, dynamic> raw;

  String get id => raw['id'] as String;
  String get ref => raw['ref'] as String? ?? '';
  String get title => raw['title'] as String? ?? '';
  String get description => raw['description'] as String? ?? '';
  double get amount => _num(raw['amount']);
  String get currency => raw['currency'] as String? ?? 'SAR';
  String get status => raw['status'] as String? ?? 'pending_funding';
  String get termsStatus => raw['terms_status'] as String? ?? 'pending';
  int get termsVersion => (raw['terms_version'] as num?)?.toInt() ?? 1;
  String? get buyerId => _str(raw['buyer_id']);
  String? get sellerId => _str(raw['seller_id']);
  String? get createdBy => _str(raw['created_by']);
  String get dealType => raw['deal_type'] as String? ?? 'goods';
  String get fundingMode => raw['funding_mode'] as String? ?? 'upfront';
  String? get shippingStatus => _str(raw['shipping_status']);
  String? get shippingCarrier => _str(raw['shipping_carrier']);
  String? get shippingTracking => _str(raw['shipping_tracking']);
  String get feePayer => raw['fee_payer'] as String? ?? 'buyer';
  int get inspectionDays => (raw['inspection_days'] as num?)?.toInt() ?? 0;
  bool get frozen => raw['frozen'] == true;
  bool get autoReleaseEnabled => raw['auto_release_enabled'] != false;
  DateTime? get autoReleaseAt => raw['auto_release_at'] == null ? null : DateTime.tryParse(raw['auto_release_at'].toString());
  DateTime get createdAt => DateTime.tryParse(raw['created_at']?.toString() ?? '') ?? DateTime.now();
  String? get counterpartyEmail => _str(raw['counterparty_email']);
  String? get inviteToken => _str(raw['invite_token']);
  double get retentionPercent => _num(raw['retention_percent']);
  int get defectsLiabilityDays => (raw['defects_liability_days'] as num?)?.toInt() ?? 0;
  String? get acceptanceCriteria => _str(raw['acceptance_criteria']);

  bool get bothJoined => buyerId != null && sellerId != null;
  bool get perMilestone => fundingMode == 'per_milestone';
  bool get needsShipping => shippingStatus != null && shippingStatus != 'not_required';
}

class Milestone {
  Milestone(this.raw);
  final Map<String, dynamic> raw;

  String get id => raw['id'] as String;
  int get seq => (raw['seq'] as num?)?.toInt() ?? 0;
  String get title => raw['title'] as String? ?? '';
  String get kind => raw['kind'] as String? ?? 'work';
  double get amount => _num(raw['amount']);
  String get status => raw['status'] as String? ?? 'pending';
  double get retentionAmount => _num(raw['retention_amount']);
  double get feeShare => _num(raw['fee_share']);
  double get vat => _num(raw['vat']);
  double get netReleased => _num(raw['net_released']);
  String? get evidenceNote => _str(raw['evidence_note']);
  String? get revisionNote => _str(raw['revision_note']);
  DateTime? get autoReleaseAt => raw['auto_release_at'] == null ? null : DateTime.tryParse(raw['auto_release_at'].toString());
}

class DealTx {
  DealTx(this.raw);
  final Map<String, dynamic> raw;
  String get kind => raw['kind'] as String? ?? '';
  double get amount => _num(raw['amount']);
  String get currency => raw['currency'] as String? ?? '';
  String get status => raw['status'] as String? ?? '';
  String? get providerRef => _str(raw['provider_ref']);
  String? get milestoneId => _str(raw['milestone_id']);
  DateTime get createdAt => DateTime.tryParse(raw['created_at']?.toString() ?? '') ?? DateTime.now();
}

class TaxInvoice {
  TaxInvoice(this.raw);
  final Map<String, dynamic> raw;
  String get number => raw['invoice_number'] as String? ?? '';
  double get fee => _num(raw['fee']);
  double get vat => _num(raw['vat']);
  double get vatRate => _num(raw['vat_rate']);
  double get total => _num(raw['total']);
  String get currency => raw['currency'] as String? ?? '';
  String? get milestoneId => _str(raw['milestone_id']);
}

class DealEvent {
  DealEvent(this.raw);
  final Map<String, dynamic> raw;
  String get title => raw['title'] as String? ?? '';
  String? get note => _str(raw['note']);
  DateTime get createdAt => DateTime.tryParse(raw['created_at']?.toString() ?? '') ?? DateTime.now();
}

class AppNotification {
  AppNotification(this.raw);
  final Map<String, dynamic> raw;
  String get id => raw['id'] as String;
  String get title => raw['title'] as String? ?? '';
  String? get body => _str(raw['body']);
  String? get dealId => _str(raw['deal_id']);
  bool get read => raw['read_at'] != null;
  DateTime get createdAt => DateTime.tryParse(raw['created_at']?.toString() ?? '') ?? DateTime.now();
}

/// Server pricing (src/lib/fees.ts FeeBreakdown + PayInQuote), shown as returned.
class Pricing {
  Pricing(this.raw);
  final Map<String, dynamic> raw;
  Map<String, dynamic> get b => (raw['breakdown'] as Map?)?.cast<String, dynamic>() ?? const {};
  Map<String, dynamic> get payIn => (raw['payIn'] as Map?)?.cast<String, dynamic>() ?? const {};
  bool get locked => raw['locked'] == true;
  String get currency => b['currency'] as String? ?? '';
  double get fee => _num(b['fee']);
  double get buyerShare => _num(b['buyerShare']);
  double get sellerShare => _num(b['sellerShare']);
  double get buyerVat => _num(b['buyerVat']);
  double get sellerVat => _num(b['sellerVat']);
  double get buyerVatRate => _num(b['buyerVatRate']);
  double get sellerVatRate => _num(b['sellerVatRate']);
  double get buyerTotal => _num(b['buyerTotal']);
  double get supplierNet => _num(b['supplierNet']);
  String get payCurrency => payIn['payCurrency'] as String? ?? currency;
  double get payTotal => _num(payIn['total']);
  double get customerRate => _num(payIn['customerRate']);
}

class FxQuote {
  FxQuote(this.raw);
  final Map<String, dynamic> raw;
  String get id => raw['id'] as String;
  String get targetCurrency => raw['target_currency'] as String? ?? '';
  double get customerRate => _num(raw['customer_rate']);
  double get fee => _num(raw['fee']);
  double get vat => _num(raw['vat']);
  double get total => _num(raw['total']);
  DateTime get expiresAt => DateTime.tryParse(raw['expires_at']?.toString() ?? '') ?? DateTime.now();
  double get providerRate => _num((raw['payIn'] as Map?)?['providerRate']);
  double get buyerVatRate => _num((raw['breakdown'] as Map?)?['buyerVatRate']);
  double get escrowConversion => _num((raw['payIn'] as Map?)?['escrowConversion']);
  double get fxSpread => _num((raw['payIn'] as Map?)?['fxSpread']);
  Map<String, dynamic>? get milestone => (raw['milestone'] as Map?)?.cast<String, dynamic>();
  bool get expired => DateTime.now().isAfter(expiresAt);
}
