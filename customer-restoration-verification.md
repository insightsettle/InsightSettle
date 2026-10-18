# Customer restoration — 18 October 2026

## Six-screen reference comparison

| Reference | Missing, collapsed or inaccessible information restored |
|---|---|
| `deals.$dealId` | Header/amount-card value; visible server payment breakdown with payer total, recipient net, fee payer, each party fee/VAT and jurisdiction, locked payer-currency amount/rate; open agreement details including inspection, automatic/manual acceptance, quantity/unit price, shipping responsibility and dates; inspection timer/banner; milestone-specific next action; uncollapsed payout plan. Freelance revision panel retained with milestones; completion rating reachable. |
| `dashboard` | Compact FX quote widget; complete demo custody note; active deal amount/status/user role, counterparty and inspection deadline; saved-deal list open by default. |
| `deals.new` | Live server-priced summary inline after step 2 and before submission on phones; native validation navigates to the correct step instead of targeting invisible fields. Role cards retained. Amount/currency, quantity/unit price, countries, fee payer, inspection, shipping, acceptance/refund/cancellation, revisions, milestone builder, advance, retention, defects and funding mode preserved. |
| `DealPanels` | Milestone schedule for every deal with rows; phone-readable amount/status/payment state, evidence and approval/revision/dispute controls; held/released retention, advance/remaining balance, next milestone funding amount. Dynamic party labels/review period restored. |
| `DealExtras` | Attachments/dispute controls reflow on phones; unknown dispute decisions display a safe label. Terms history, invoices, conversation and timeline remain reachable. |
| `DealPresentation` | Existing new components and full bilingual simulated-provider custody notice retained; no reference functionality removed. |

## Other fixes
- Staff client-page access waits for staff resolution then redirects to console without customer content/tabs.
- Customer account progress scopes reads to current user and reflects rejection, payout verification and read errors; profile/document changes refresh it.
- Reports/audit tables contain their horizontal scrolling instead of overflowing the page.
- Sign-in uses the shared bilingual text provider, removing the reproduced hydration language mismatch.
- Missing leaf social metadata completed; shared info-page metadata already supplied the remaining routes.
- `reference/` deleted after comparison.

## Preview verification
- Requested admin, buyer and supplier accounts used through the UI; no credential changes or database patches.
- DL-24817: terms, SAR funding, shipping, delivery, visible countdown, acceptance and release succeeded.
- Goods locked quote: SAR 10,239.34; deal BHD 1,000.000; fee BHD 27.820; buyer VAT BHD 2.087 (15%); seller VAT BHD 1.391 (10%); net BHD 984.699.
- DL-30512: funded through existing quote; four milestones submitted/approved/released. BHD 10,000.000 contract, BHD 1,000.000 advance, BHD 500.000 retention remains held until 16 January 2027. Remaining work balance BHD 0.000; released net BHD 9,424.837.
- English/Arabic, desktop 1280 and phone 390 checked for named deal pages, dashboard, verification and creation; requested console sections checked. No document horizontal overflow; final browser page-error lists empty.
- New form invalid inspection value cannot advance; summary visible on steps 2 and 3 in both languages. No extra deal submitted during form validation.
- 123/123 tests passed, including ten independent PostgreSQL race tests; automatic TypeScript/build checks passed.

## Limits
- Future retention release and automatic deadline release were not forced by changing dates; they remain governed by existing server rules.
- Per-milestone funding has presentation/unit coverage; the requested demo contract uses upfront funding, so that alternative was not funded end-to-end.
- No money engine, settlement, ledger, invoices, database triggers, Flutter changes or publication.
