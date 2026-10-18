import 'package:flutter_test/flutter_test.dart';
import 'package:insight_mobile/deal_rules.dart';
import 'package:insight_mobile/models.dart';

const buyer = 'buyer-1';
const seller = 'seller-1';

Deal deal(Map<String, dynamic> over) => Deal({
      'id': 'd1',
      'ref': 'DL-1',
      'title': 'Demo',
      'amount': 1000,
      'currency': 'BHD',
      'status': 'pending_funding',
      'terms_status': 'pending',
      'buyer_id': buyer,
      'seller_id': seller,
      'created_by': seller,
      'deal_type': 'goods',
      'funding_mode': 'upfront',
      'shipping_status': 'preparing',
      ...over,
    });

Milestone ms(int seq, String status) => Milestone({'id': 'm$seq', 'seq': seq, 'title': 'M$seq', 'amount': 500, 'status': status});

void main() {
  test('the invited party accepts the terms; the creator cannot', () {
    final d = deal({});
    expect(dealActions(d, const [], buyer), contains(DealAction.acceptTerms));
    expect(dealActions(d, const [], seller), isNot(contains(DealAction.acceptTerms)));
    expect(dealActions(d, const [], buyer), isNot(contains(DealAction.fund)));
  });

  test('only the buyer funds, once the terms are agreed', () {
    final d = deal({'terms_status': 'agreed'});
    expect(dealActions(d, const [], buyer), contains(DealAction.fund));
    expect(dealActions(d, const [], seller), isNot(contains(DealAction.fund)));
  });

  test('goods flow: supplier ships and confirms, buyer releases', () {
    final held = deal({'terms_status': 'agreed', 'status': 'held'});
    expect(dealActions(held, const [], seller), containsAll([DealAction.updateShipping, DealAction.confirmDelivery]));
    final delivered = deal({'terms_status': 'agreed', 'status': 'delivered'});
    expect(dealActions(delivered, const [], buyer), containsAll([DealAction.release, DealAction.requestRevision, DealAction.openDispute]));
    expect(dealActions(delivered, const [], seller), isNot(contains(DealAction.release)));
  });

  test('a frozen deal offers nothing; an outsider sees nothing', () {
    expect(dealActions(deal({'frozen': true, 'terms_status': 'agreed'}), const [], buyer), isEmpty);
    expect(dealActions(deal({'terms_status': 'agreed'}), const [], 'someone-else'), isEmpty);
  });

  test('per-milestone funding: the buyer funds the next unfunded milestone while in progress', () {
    final d = deal({'terms_status': 'agreed', 'status': 'in_progress', 'funding_mode': 'per_milestone', 'deal_type': 'services', 'shipping_status': 'not_required'});
    final list = [ms(1, 'released'), ms(2, 'pending')];
    expect(nextMilestoneToFund(d, list)?.seq, 2);
    // Lowest sequence wins whatever order the rows arrive in.
    expect(nextMilestoneToFund(d, [ms(3, 'pending'), ms(1, 'released'), ms(2, 'pending')])?.seq, 2);
    expect(dealActions(d, list, buyer), contains(DealAction.fund));
    final done = [ms(1, 'released'), ms(2, 'funded')];
    expect(dealActions(d, done, buyer), isNot(contains(DealAction.fund)));
  });

  test('milestones: supplier submits a funded one, buyer approves a submitted one', () {
    final d = deal({'terms_status': 'agreed', 'status': 'in_progress', 'deal_type': 'services'});
    expect(milestoneActions(d, ms(1, 'funded'), seller), contains(MilestoneAction.submit));
    expect(milestoneActions(d, ms(1, 'funded'), buyer), isNot(contains(MilestoneAction.submit)));
    expect(milestoneActions(d, ms(1, 'submitted'), buyer), containsAll([MilestoneAction.approve, MilestoneAction.requestRevision]));
    expect(milestoneActions(d, ms(1, 'pending'), seller), isEmpty);
  });

  test('next step text and the needs-action flag', () {
    expect(nextStep(deal({}), const [], buyer), 'Review and accept the terms');
    expect(nextStep(deal({'terms_status': 'agreed'}), const [], buyer), 'Fund the deal');
    expect(nextStep(deal({'status': 'released'}), const [], buyer), isNull);
    expect(needsMyAction(deal({'terms_status': 'agreed'}), const [], buyer), isTrue);
    expect(needsMyAction(deal({'terms_status': 'agreed'}), const [], seller), isFalse);
  });

  test('reads the invitation token from a link or a bare code', () {
    expect(inviteTokenFrom('https://insightsettle.com/invite/abcDEF123456_-xy'), 'abcDEF123456_-xy');
    expect(inviteTokenFrom('  abcdef1234567890  '), 'abcdef1234567890');
    expect(inviteTokenFrom('hello world'), isNull);
  });
}
