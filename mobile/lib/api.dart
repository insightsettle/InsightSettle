import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

import 'config.dart';
import 'models.dart';

/// New Supabase publishable keys are not JWTs: send them only as `apikey`, never as a bearer token
/// (the website does the same in src/integrations/supabase/auth-middleware.ts).
class PublishableKeyClient extends http.BaseClient {
  PublishableKeyClient([http.Client? inner]) : _inner = inner ?? http.Client();
  final http.Client _inner;

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) {
    if (request.headers['Authorization'] == 'Bearer ${AppConfig.supabaseKey}' ||
        request.headers['authorization'] == 'Bearer ${AppConfig.supabaseKey}') {
      request.headers.remove('Authorization');
      request.headers.remove('authorization');
    }
    request.headers['apikey'] = AppConfig.supabaseKey;
    return _inner.send(request);
  }
}

class ApiException implements Exception {
  ApiException(this.message, {this.status = 400});
  final String message;
  final int status;
  @override
  String toString() => message;
}

SupabaseClient get sb => Supabase.instance.client;
String? get currentUserId => sb.auth.currentUser?.id;

/// Party actions through the mobile API (/api/v1), which calls the same server rules as the website.
class InsightApi {
  InsightApi({http.Client? client}) : _client = client ?? http.Client();
  final http.Client _client;

  Future<dynamic> action(String name, Map<String, dynamic> body) async {
    final token = sb.auth.currentSession?.accessToken;
    if (token == null) throw ApiException('Sign in required.', status: 401);
    final res = await _client.post(
      Uri.parse('${AppConfig.siteUrl}/api/v1/$name'),
      headers: {'Authorization': 'Bearer $token', 'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    Map<String, dynamic> data;
    try {
      data = (jsonDecode(res.body) as Map).cast<String, dynamic>();
    } catch (_) {
      throw ApiException('The service is not reachable right now. Please try again.', status: res.statusCode);
    }
    if (res.statusCode >= 400 || data['ok'] != true) {
      final issues = data['issues'];
      var msg = data['error']?.toString() ?? 'The action could not be completed.';
      if (issues is List && issues.isNotEmpty) {
        msg = '$msg ${issues.map((i) => (i as Map)['message']).whereType<String>().join(' ')}';
      }
      throw ApiException(msg, status: res.statusCode);
    }
    return data['result'];
  }

  // Reads protected by row-level security, with the user's own token.
  Future<List<Deal>> listDeals() async {
    final rows = await sb.from('deals').select().order('created_at', ascending: false);
    return (rows as List).map((r) => Deal((r as Map).cast<String, dynamic>())).toList();
  }

  Future<Map<String, List<Milestone>>> milestonesFor(List<String> dealIds) async {
    if (dealIds.isEmpty) return {};
    final rows = await sb.from('deal_milestones').select().inFilter('deal_id', dealIds).order('seq');
    final out = <String, List<Milestone>>{};
    for (final r in rows as List) {
      final m = Milestone((r as Map).cast<String, dynamic>());
      out.putIfAbsent(r['deal_id'] as String, () => []).add(m);
    }
    return out;
  }

  Future<DealBundle?> loadDeal(String ref) async {
    final row = await sb.from('deals').select().eq('ref', ref).maybeSingle();
    if (row == null) return null;
    final deal = Deal(row);
    final results = await Future.wait<List<dynamic>>([
      sb.from('deal_milestones').select().eq('deal_id', deal.id).order('seq'),
      sb.from('deal_transactions').select().eq('deal_id', deal.id).order('created_at', ascending: false),
      sb.from('tax_invoices').select().eq('deal_id', deal.id).order('issued_at'),
      sb.from('deal_events').select().eq('deal_id', deal.id).order('created_at', ascending: false).limit(30),
    ]);
    Pricing? pricing;
    try {
      final p = await action('deal-pricing', {'dealId': deal.id});
      if (p is Map) pricing = Pricing(p.cast<String, dynamic>());
    } catch (_) {
      pricing = null;
    }
    List<Map<String, dynamic>> cast(dynamic v) => (v as List).map((r) => (r as Map).cast<String, dynamic>()).toList();
    return DealBundle(
      deal: deal,
      milestones: cast(results[0]).map(Milestone.new).toList(),
      transactions: cast(results[1]).map(DealTx.new).toList(),
      invoices: cast(results[2]).map(TaxInvoice.new).toList(),
      events: cast(results[3]).map(DealEvent.new).toList(),
      pricing: pricing,
    );
  }

  Future<List<AppNotification>> notifications() async {
    final rows = await sb.from('notifications').select().order('created_at', ascending: false).limit(50);
    return (rows as List).map((r) => AppNotification((r as Map).cast<String, dynamic>())).toList();
  }

  Future<void> markAllRead() async {
    final uid = currentUserId;
    if (uid == null) return;
    await sb
        .from('notifications')
        .update({'read_at': DateTime.now().toUtc().toIso8601String()})
        .eq('user_id', uid)
        .isFilter('read_at', null);
  }

  Future<String?> dealRefById(String id) async {
    final row = await sb.from('deals').select('ref').eq('id', id).maybeSingle();
    return row?['ref'] as String?;
  }

  Future<Map<String, dynamic>?> myProfile() async {
    final uid = currentUserId;
    if (uid == null) return null;
    return await sb.from('profiles').select().eq('id', uid).maybeSingle();
  }
}

class DealBundle {
  DealBundle({
    required this.deal,
    required this.milestones,
    required this.transactions,
    required this.invoices,
    required this.events,
    required this.pricing,
  });
  final Deal deal;
  final List<Milestone> milestones;
  final List<DealTx> transactions;
  final List<TaxInvoice> invoices;
  final List<DealEvent> events;
  final Pricing? pricing;
}

final api = InsightApi();
