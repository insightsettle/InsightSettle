# Insight roadmap

## Done

- Marketing home page, how-it-works, roles, services pages
- Auth (email/password + Google), profiles, KYC status, staff roles
- Client dashboard, deal creation, invite links, deal page (timeline, actions, conversation, note for Insight)
- Staff console at /console: overview KPIs, all deals, members, currency rates, fee rules, dispute resolution
- AI dispute mediation, document review, FX spread reporting (internal)
- AI risk review tab (/console/risk): screens selected deals + pasted messages, ranks deals needing review, saves risk flags
- Payment records: every funding / release / refund recorded with status, provider, reference and error message; buyer starts funding and release, staff confirms or rejects with a reason; both parties see the outcome
- In-app notifications with header bell: status changes, messages, arbitration requests, payment outcomes
- Arabic and English interface with a persistent language switch across public, customer, and staff pages

- PRD phase 1 (partial): shared FX rates + fee rules tables, 15-min FX quotes with expiry block, double-entry ledger, audit log triggers, double-payment protection, GCC currencies

## Open (PRD compliance plan)

- [ ] Phase 1: point console rates/fees screens at the new shared tables (still browser-saved); full server-enforced state machine
- [ ] Phase 2: extra deal fields, attachments, terms versions, cancellation rules, scheduled auto-release
- [ ] Phase 3: real disputes table with evidence, SLA deadlines, partial settlement, refunds linked to original payment
- [ ] Phase 4: KYC individual/business fields, support/finance/compliance/super-admin roles, rule-based risk engine, admin 2FA
- [ ] Phase 5: VAT per country, ZATCA tax invoice PDF, IBAN payouts, buyer/supplier dashboards, missing public pages, PDPL consent
- [ ] Email notifications — blocked: requires a verified sender domain (insightpayx.com) set up by the owner
- [ ] Live payment provider (Moyasar / HyperPay / Tap / Stripe) — blocked: owner choice
- [ ] Grant staff access to the owner's own account once they register
