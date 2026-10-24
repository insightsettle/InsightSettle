# Staff control centre — batch 1

## Completed first
The demo dataset was reset through the console and refreshed: the four milestone test contracts are gone; the two starting deals, auction and open lot are restored.

## A. Auction settings and pre-payment controls
- Add admin-only `/console/auction-settings` with standard bands (default), percentage fees with minimum/maximum per lot, and fixed USD fees converted at the existing rates.
- **Assumption:** percentage-mode minimum and maximum are entered in USD, matching the existing fee schedule. No new supportive rate is invented; standard bands remain active until the founder chooses values.
- Configure default and maximum organiser commission; enforce the maximum in organiser forms and on the server. Existing paid allocations remain untouched.
- Add staff-only, reason-required lot split editing before payment. Owner and organiser percentages must total 100.
- Changes to fee settings affect newly created quotes only. Existing quote amounts, used quotes, invoices and funded deals remain immutable.
- Show a separate active auction-fee section on public pricing when it differs from standard bands; ordinary calculators retain their empty defaults and ordinary pricing.

## B. Customer 360
- Add `/console/users/$userId` with profile, KYC status, payout verification, paginated deals/payments/invoices/disputes/notifications and last sign-in.
- Add reason-required, audited reset-email, verification-email, email/phone correction, suspension/reactivation and staff-only note actions.
- Suspension does not ban sign-in; enforce creation/funding restrictions server-side, including auction funding.
- Include a read-only customer summary; never impersonate or sign in as the customer.
- Email actions distinguish accepted sending requests from confirmed delivery; fictional addresses may reject delivery. Never bypass suppression or confirmation requirements.

## C. Deal interventions
- Extend the existing staff deal page with reason-required payment/delivery/inspection deadline extensions, freeze/unfreeze, invitation resend, pre-join counterparty-email correction, staff-only notes and last-notification resend.
- Expose existing deadline fields without changing release rules. Payment extensions cannot revive an expired bidder offer or bypass bidder order.
- Keep release/refund/cancellation-with-refund on a server-enforced two-reviewer decision path. Reuse existing dispute approval where applicable; do not expose a direct status or settlement bypass.

## D. Global search
- Replace the inert console-header search with a bounded, staff-authorized search for email, phone, name, DL reference, invoice number and provider reference.
- Results navigate to the corresponding customer or staff deal page. Make search accessible on phones as well as desktop.

## Technical safeguards
- Reuse existing staff authorization, generated clients, audit log and notification/email infrastructure. Privileged operations verify permissions before loading the privileged client.
- Add migrations for auction settings, protected internal notes and narrow atomic interventions; include grants, RLS and actor/reason/before/after audit records.
- Split editing locks auction → lot → deal, refuses funded or in-flight payments, updates pending payout splits and versioned terms together, and keeps historical quotes unchanged. Quotes for superseded terms cannot fund; a winner must obtain a fresh quote. Do not remove existing transaction/funding locks.
- Isolate the fee-mode calculation to the auction pricing path, then reuse existing fee-share VAT, FX, invoice and ledger functions. Preserve normal deal fees with concrete regression tests.
- No Flutter changes, licensing claims, batch-2 inbox/settings/permission redesign or publication.

## Validation and cleanup
- Unit tests: each fee mode, USD bounds/caps, currency rounding, unchanged VAT, ordinary fee regression, commission restrictions, suspension and intervention authorization/reasons.
- Database tests: pre-payment edits, funded/used-quote immutability, stale-term refusal, concurrent edit/funding protections and staff-only notes.
- Preview checks with admin, client and a second reviewer: customer actions, search, deal interventions and auction quote-to-payment behavior; Arabic/English at 375px and desktop.
- Verify tests and automatic build, restore settings/account changes made by tests, remove temporary reviewer privileges if needed, then reset demo data through the console.
- Final report: feature — result — notes, with delivery or fixture limitations stated explicitly.
