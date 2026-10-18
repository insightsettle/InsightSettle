import 'models.dart';

/// Which party actions the app offers. Mirrors the website screens; the server enforces every rule again.
enum DealAction {
  acceptTerms,
  requestTermsChange,
  fund,
  updateShipping,
  confirmDelivery,
  requestRevision,
  release,
  openDispute,
}

enum MilestoneAction { submit, approve, requestRevision, openDispute }

const _closed = {'released', 'refunded', 'partially_refunded', 'cancelled', 'rejected', 'completed'};

bool isClosed(Deal d) => _closed.contains(d.status);

/// Next milestone waiting for funding on a per-milestone deal.
Milestone? nextMilestoneToFund(Deal d, List<Milestone> ms) {
  if (!d.perMilestone) return null;
  for (final m in ms) {
    if (m.status == 'pending') return m;
  }
  return null;
}

List<DealAction> dealActions(Deal d, List<Milestone> ms, String? userId) {
  if (userId == null || d.frozen) return const [];
  final isBuyer = d.buyerId == userId;
  final isSeller = d.sellerId == userId;
  if (!isBuyer && !isSeller) return const [];
  final out = <DealAction>[];
  final auction = d.dealType == 'auction';

  if (!auction && d.status == 'pending_funding' && d.termsStatus != 'agreed' && d.bothJoined && d.createdBy != userId) {
    out
      ..add(DealAction.acceptTerms)
      ..add(DealAction.requestTermsChange);
  }

  final termsOk = auction || d.termsStatus == 'agreed';
  final fundable = d.perMilestone
      ? (d.status == 'pending_funding' || d.status == 'in_progress') && nextMilestoneToFund(d, ms) != null
      : d.status == 'pending_funding';
  if (isBuyer && termsOk && d.bothJoined && fundable) out.add(DealAction.fund);

  if (ms.isEmpty) {
    if (isSeller && d.status == 'held' && d.needsShipping && !auction) out.add(DealAction.updateShipping);
    if (isSeller && d.status == 'held' && !auction) out.add(DealAction.confirmDelivery);
    if (isBuyer && d.status == 'delivered' && !auction) out.add(DealAction.requestRevision);
    if (isBuyer && (d.status == 'delivered' || d.status == 'under_review')) out.add(DealAction.release);
    if ({'held', 'delivered', 'under_review'}.contains(d.status)) out.add(DealAction.openDispute);
  }
  return out;
}

List<MilestoneAction> milestoneActions(Deal d, Milestone m, String? userId) {
  if (userId == null || d.frozen || d.status != 'in_progress') return const [];
  final isBuyer = d.buyerId == userId;
  final isSeller = d.sellerId == userId;
  final out = <MilestoneAction>[];
  if (isSeller && (m.status == 'funded' || m.status == 'revision_requested')) out.add(MilestoneAction.submit);
  if (isBuyer && m.status == 'submitted') {
    out
      ..add(MilestoneAction.approve)
      ..add(MilestoneAction.requestRevision);
  }
  if ((isBuyer || isSeller) && {'funded', 'submitted', 'revision_requested'}.contains(m.status)) {
    out.add(MilestoneAction.openDispute);
  }
  return out;
}

/// One-line "what happens next" for the deals list (English key; the screen translates it).
String? nextStep(Deal d, List<Milestone> ms, String? userId) {
  if (isClosed(d)) return null;
  final isBuyer = d.buyerId == userId;
  if (d.frozen) return 'On hold by Insight';
  if (d.status == 'disputed') return 'Dispute under review';
  if (!d.bothJoined) return 'Waiting for the other party to join';
  final actions = dealActions(d, ms, userId);
  if (actions.contains(DealAction.acceptTerms)) return 'Review and accept the terms';
  if (d.status == 'pending_funding' && d.termsStatus != 'agreed') return 'Waiting for the other party to accept the terms';
  if (actions.contains(DealAction.fund)) return d.perMilestone ? 'Fund the next milestone' : 'Fund the deal';
  if (d.status == 'pending_funding') return 'Waiting for the buyer to fund';
  if (actions.contains(DealAction.confirmDelivery)) return 'Ship and confirm delivery';
  if (d.status == 'held') return 'Waiting for the supplier to deliver';
  if (actions.contains(DealAction.release)) return 'Inspect and release the funds';
  if (d.status == 'delivered' || d.status == 'under_review') return isBuyer ? 'Inspect and release the funds' : 'Buyer is inspecting';
  if (d.status == 'in_progress') {
    for (final m in ms) {
      if (milestoneActions(d, m, userId).any((a) => a != MilestoneAction.openDispute)) {
        return m.status == 'submitted' ? 'Review the submitted milestone' : 'Submit the next milestone';
      }
    }
    return 'Contract in progress';
  }
  return null;
}

bool needsMyAction(Deal d, List<Milestone> ms, String? userId) {
  if (dealActions(d, ms, userId).any((a) => a != DealAction.openDispute && a != DealAction.requestTermsChange)) return true;
  return ms.any((m) => milestoneActions(d, m, userId).any((a) => a != MilestoneAction.openDispute));
}

/// Extracts an invitation token from a pasted link (https://insightsettle.com/invite/<token>) or the token itself.
String? inviteTokenFrom(String input) {
  final s = input.trim();
  if (s.isEmpty) return null;
  final m = RegExp(r'/invite/([A-Za-z0-9_-]{8,80})').firstMatch(s);
  if (m != null) return m.group(1);
  if (RegExp(r'^[A-Za-z0-9_-]{8,80}$').hasMatch(s)) return s;
  return null;
}
