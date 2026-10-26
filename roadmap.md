# Roadmap
- [ ] Finance Center: inspect existing flows and record file-specific architecture.
- [ ] Finance Center: provider capability registry and sandbox-only adapter boundary.
- [ ] Finance Center: normalized exact-decimal transaction reads and currency-separated reporting.
- [ ] Finance Center: existing-console overview, transactions/detail, providers, queue, reconciliation, routing, exports and monitoring.
- [ ] Finance Center: append-only audited maker-checker metadata, idempotency and safe routing/reconciliation tests.
- [ ] Finance Center: authenticated bilingual phone/desktop verification, full regression tests and STATUS documentation; preserve data, no publication.
- [x] 24 Oct 12:20 batch 1 initial console reset: 6 deals removed, two demo deals/one auction/one lot restored through UI.
- [x] Staff batch 1 A: admin auction-only standard/percentage/fixed modes, commission defaults/cap, audited pre-payment split edits and public pricing. Live USD 4/public disclosure and 85/15→80/20 split verified; defaults standard/15/100 restored. Currency/VAT/standard-deal/locked-quote regressions pass.
- [x] Staff batch 1 B: Customer 360 and audited reason-required account actions; notes, phone update/removal, suspend/reactivate, signed-in create/fund rejection and reset-request acceptance verified. Fixed suspended funding consuming a quote; retry after reactivation succeeded. Original demo phone restored; no impersonation.
- [x] Staff batch 1 C: live deadline extensions, notes, freeze/unfreeze and joined-email refusal verified; unresolved-dispute unfreeze refused. Existing second staff approved admin's DL-24817 70/30 proposal; SAR/BHD ledgers balanced and held zero. Existing funded cancellation requires refund review; direct financial status changes refused.
- [x] Staff batch 1 D: email/name/DL search navigates to correct Customer360/deal UUID pages; invoice/provider queries implemented. AR/EN 375px Customer360 has no horizontal overflow.
- [x] Staff batch 1 validation: 142 tests passed, 10 independent database-race tests skipped; automatic build/typecheck verification. Final console reset restored 2 pending deals, 1 auction, 1 open lot; settings restored and mobile unchanged, no publication.
- [ ] Staff batch 1 remaining delivery verification: password-reset request accepted but mailbox arrival/recovery session unverified; resend verification needs an unconfirmed reachable recipient; pending invite correction/resend needs an unjoined eligible deal; last-notification resend needs a sent notification (empty fixture correctly refused); invoice/provider search needs matching populated records. No email suppression bypass.
- [x] 24 Oct 12:07 milestone form: labeled bilingual fields, 375px containment, equal allocation (SAR 5,000 → 1,666.66/1,666.66/1,666.68), opt-in retention and advance copy. AR/EN No/Yes creations verified via UI: DL-46830/DL-71742 retention 0%, defects 0 days; DL-63814/DL-22371 retention 5%, defects 90 days. No input/page overflow, amount bar clears phone tabs by 13.5px; 123 tests passed, 10 DB-race tests skipped, automatic build OK. Financial/server/mobile unchanged, empty amounts and removed unit-price hint preserved; no publication.
- [x] 24 Oct: visitor-initiated contact popup verified closed after 31 seconds and scroll; manual open/close verified EN desktop and AR mobile, design unchanged.
- [x] 24 Oct: DL-24817 two-staff 70/30 decision completed; BHD 700 refund + 295.410 net payout + 4.173 fee + 0.417 VAT = 1,000; escrow zero and each currency ledger balanced. Temporary reviewer role removed.
- [x] 24 Oct: per-milestone DL-26588 created with BHD 500/1,000/1,500 stages; first funded/submitted/released, second funded, separate INV-1040/1041 verified; next funding BHD 1,500. Correct stale pricing/invoice refresh and consumed quote display; legacy funding history classified from actual transaction kind without financial changes.
- [x] 24 Oct 11:57 auction 2c: client declined SAR 48,000 DL-09458 without payment; supplier backup 1 received SAR 47,000 DL-38908, paid, organiser shipped/delivered, buyer accepted. Direct owner SAR 39,950 and organiser SAR 7,050 legs succeeded; plus fee SAR 835.63 and VAT SAR 83.56 = SAR 47,919.19. Actual BHD pay-in 4,855.172 reconciles conversion 4,712.549 + provider spread 50.459 + fee 83.786 + VAT 8.378. Both currency ledgers balanced and escrow held zero. Fixed display-only countdown remaining active after completion; 118 tests passed, 10 local-DB race tests skipped, automatic build OK. Fictional backup 2 was email-only (no auth account created); console reset removed its entry and restored the dataset. No money/mobile changes or publication.
- [x] 24 Oct: console reset restored two pending demo deals, one auction, one open lot and zero payment transactions. Money logic and mobile unchanged; no publication.
- [x] Mobile 18 Oct wording parity: contextual roles, generic copy, receipt/release label, supported OTHER outside-Gulf country option and widget coverage added; business logic/API calls unchanged. Static translation and legacy-label checks pass. No web edits or publication.
- [ ] Mobile Flutter test/analyze execution: Flutter unavailable locally; existing GitHub Actions runs these checks on push; CI result not yet verified.
- [x] Delivered Arabic X cover at 1500×500 using official logo, original Thmanyah Sans and platform colours; visually checked unclipped text. Bio (129 characters), separate UTM profile/pinned links and demo-aware pinned post (217 weighted characters) supplied for manual upload; no account posting.
- [x] Add bilingual dismissible homepage contact popup with corner X and reopen button; verified 390px/1280px, Arabic/English, Escape, and actual submission. Managed email log confirms notification sent to insightsettle@gmail.com; three validation/delivery tests passed and automatic build clean. No publication.
- [x] Platform follow-up audit: 96 EN/AR public/customer/staff page visits at desktop/390px, no page overflow or runtime errors; auth follow-up route nesting corrected, public/legal/KYC/invoice localization and error feedback restored, services calculator shares live pricing. All four deal-type wizards reach step 3 in EN/AR; real invoices/invite checked. Three accounts signed in/out and changed/restored passwords via UI with current-password verification. 123 regression tests passed; automatic TypeScript/build clean. Money logic/mobile unchanged; no publication.
- [ ] Platform audit email-recovery verification: recovery request acknowledged but client mailbox bounced; valid email-link session requires a reachable recipient. Signed-in password updates tested and restored, not a substitute for email-link E2E.
- [ ] Platform audit remaining action verification: new open-dispute/four-eyes decision, auction mutation, document AI analysis and future retention/per-milestone funding require eligible fixtures/service availability; existing goods/contracting fixtures already completed in restoration, no repeated funding/release.
- [x] 18 Oct customer restoration: six-screen audit completed; visible deal breakdown, inspection timer, milestone schedule, mobile summary, FX widget, terms and controls restored; reference removed.
- [x] 18 Oct staff separation: customer prompts/tabs suppressed; admin client pages redirect to console; requested console pages verified in English/Arabic at desktop/390px.
- [x] 18 Oct verification: 123/123 Vitest tests passed including PostgreSQL races, automatic TypeScript/build OK, named goods and four contracting milestones completed through UI. EN/AR desktop/390px pages and wizard validation passed without page overflow or runtime errors. BHD 500 retention remains held until 16 Jan 2027 by existing terms; future retention/automatic deadline release not time-travel tested; per-milestone funding display/unit coverage only (named contract is upfront). No publication or money-logic/mobile changes.
- [x] C09-D26: corrected only acceptTerms/updateShipping load arguments; full suite once: 82 passed, 10 skipped, test-only RPC mock failed then isolated regression rerun passed (83 passing tests across runs). DL-44255 shipped/delivered/accepted via parties; direct legs succeeded with DL-44255-RELEASE-OWNER SAR 40800 and DL-44255-RELEASE-ORG SAR 7200. T22-a/b/c PASS; organiser-session split update refused and unverified fictional owner refused via lot UI. SAR escrow_held 0, ledger debit-credit 0; INV-1004 matches locked quote fee 845.63/VAT 0. All temporary passwords invalidated, final Arabic screenshot reviewed; no repeated funding, data patches or publishing.
- [x] C09-D25: align auction and public calculator money input minimum/step; SAR 48000 and BHD 1000.500 regression passes. 82 tests passed, 10 skipped; preview build OK; no publishing.
- [x] T22 continuation: existing lot 08ff680a-3b38-48f9-ba3c-5314f026f742 and DL-44255 completed after C09-D26; a/b/c all passed with no repeated funding or data patches.
- [x] Add shared auction shipping/delivery/inspection acceptance controls using existing actions and direct split settlement; add audited staff business/demo-payout verification. 81 tests passed, 10 PostgreSQL race tests skipped without retrying setup; automatic type/build clean. Production-flow verification remains incomplete because the single allowed T22 run stopped during setup.
- [x] Auctions step 5: read-only console Auctions tabs, auction-only authenticity reason using existing dispute flow, one Arabic staff screenshot reviewed; 74 tests passed, automatic type/build clean; staff temporary password invalidated; no publishing. Ten independent PostgreSQL tests could not run because this sandbox's PostgreSQL library setup fails before initialization.
- [x] Auctions step 6: owner-authorized T22 continuation completed DL-44255; a/b/c pass. Earlier setup and shipping blockers resolved in separately authorized runs; all temporary passwords invalidated; no publishing.
- [x] Auctions step 4: Arabic-first organiser/list/detail/forms, winner invite payment and read-only owner screen, conditional sidebar/account flag; 81 tests including real concurrency passed, automatic types/build clean; two Arabic signed-in screenshots reviewed; DL-11339 created and funded through UI; temporary passwords invalidated; no publishing or money-logic changes.
- [ ] Auctions step 4 reminder delivery: test buyer mailbox bounced and managed sending blocked it (unreachable_mx); needs a reachable recipient, suppression must not be bypassed. Photo upload/owner-email path not exercised end-to-end. Existing /auth saved-language hydration warning observed; auction screens and EN mobile layouts worked without overflow.
- [x] Auctions step 3: atomic winner recording, ordered expiry/decline and unsold notifications, email invite links, verified-email invite claims, atomic quote/funding acceptance, existing managed 10-minute callback extended unchanged; real independent PostgreSQL funding/funding and funding/sweep races verified; no screens or publishing. Hosted callback changes activate only after publication; no live auction records mutated.

- [x] Auctions step 2: direct owner/organiser release legs created atomically, independent confirmation and payable ledger accounts, forced buyer-only existing USD pricing, locked auction dispute shares, auto-release auction branch, final-status confirmation guard; 66 tests passed including T22-a/e/f and all previous regressions; no publishing. Provider remains simulated; no live auction UI exists yet.

- [x] Auctions step 1: migration 0005 applied; locked direct beneficiary shares, verified beneficiaries, ordered bidders and funding reservations/deadlines, C01 public-read grants; actual-migration isolated database tests; no screens, settlement changes or publishing. True parallel live-provider race testing belongs to the later funding integration step.

- [x] UX-D: homepage/navigation/footer and pricing v1; shared existing fee engine adapter; Arabic-first with saved-language preservation; 40 tests and two Arabic captures; no publishing.
- [x] UX-D public pricing permission blocker: C01 / D-51 anonymous read policies and safe-column grants mirrored in migration 0005; no fallback figures or privileged bypass used.

- [x] UX-C: staff overview and paginated guarded read-only reconciliation, deal milestones/retention, dispute positions/timeline/decision presentation; D21 cancel routing tested through existing guard without writes; Arabic overview/contract screenshots reviewed; automatic type/build checks clean; no publishing.
- [ ] UX-C open dispute decision/evidence verification: no live dispute exists. Needs a real test case; no fictional dispute or financial mutation created. R2 remains unverified without an independent provider statement; R4/R5 existing-data exceptions are displayed, not changed.

- [x] UX-B: client home, goods/contracting presentation, new-deal grouping, D22 quote display, bilingual custody/VAT; 33 tests and automatic type check/build clean; signed-in EN/AR dashboard, AR goods/new reviewed, mobile navigation checked; no publishing.
- [x] UX-B live-summary fee figures: current shared server preview restored visibly on phone step 2 and before submission; no new pricing logic.
- [x] UX-B contracting screenshot/approval-state verification: verified through authorised DL-30512 four-milestone flow on 18 Oct.

- [x] UX-A: apply v1 tokens, bilingual client/staff shells, statuses, cards/tables; verify automatic type check/build and 31 unit tests. No publishing or business logic changes.
- [x] UX-A signed-in EN/AR dashboard and console verification completed using authorised accounts on 18 Oct.

- [x] Display-only: format deal history, invoices, milestone editor and console amounts with currency minor units; verify types and tests.

- [x] C09-D15: lock dispute payout legs, preserve milestone retention, and run BHD/SAR settlement regression tests.

- [x] Complete SRS FR-081/082/083 English/Arabic copy-only corrections and provide every old-to-new string.

## Done
- Shared FX rates and fee rules, 15-minute rate quotes, double-entry ledger, audit log, protection against paying twice
- GCC deal terms, term versions, files and evidence, cancellation, disputes with deadlines, tax invoice view
- KYC personal/business details, GCC IBAN, account restriction, staff freeze and document requests
- PDPL consent at sign-up, mandatory two-step verification for staff
- Buyer/supplier/business/security/FAQ pages, real dashboard figures

## Waiting on the owner
- Licensed payment provider account (real funding, release, refund, payouts)
- Verified email sending domain
- Real company name, VAT number and CR for tax invoices (placeholder now); ZATCA review
- Decision on auto-release check frequency (hourly now, PRD asks 15 min — higher cost)
- Legal review of terms/privacy and provider licensing disclosures

- [x] Keep the admin MFA wall enabled; represent protected console capabilities visually in the investor film.
- [x] Add a professional cover, a very short introduction, and continuous low-volume cinematic financial music to the investor film.
- [x] Replace the distracting score with a smooth low-frequency ambient bed without bird-like or sharp sounds.
- [x] Add the official Insight logo to the investor film opening and closing scenes.

- [x] Add an opening fintech context explaining traditional escrow and its transformation into Insight’s digital financial infrastructure.
- [x] Add a varied escrow transaction journey, funds/dispute/refund explainer, and competitive-growth closing to the investor film.
- [x] Replace the repeated four-step list throughout the investor film with varied diagrams and add a standalone narrated page with SAR 50,000 and USD 50,000 revenue calculations.
- [x] Shorten the investor film without removing content; add a five-second music-only opening and clean voice transitions.
- [x] Add a concise investor-film slide connecting escrow, cross-border deal support, and Gulf financial compliance.
- [x] Convert the original embedded customer screenshot from dark to light without replacing its content.
- [x] Ensure the recolored original screenshot uses neutral white, never pink.

## Done
- [x] Identify the repeated dark screenshot flash shown in the uploaded clip and remove every occurrence from the latest investor film.

## In progress
- [x] Rebuild the investor film without time compression, giving every page enough on-screen time to match its natural-speed narration and removing skipped-page transitions.
- [x] Complete slides 8, 10, 14, 22, 23 and 24; restore slides 9 and 15; use the official logo on slides 1 and 25; make all slide backgrounds white; export the revised narrated film.
- [x] Re-record slide-specific founder-style narration, verify all 25 slide-to-audio timings (including slide 8), and add soft dissolve transitions without cutting speech.
- [x] Remove investor-film slides 17 and 18, resolve the slide 24 timeline overlap, renumber the deck, and export the refined 23-slide film with matched narration.
- [x] Remove repeated investor-film slides 6, 19, and 20; merge their unique points into retained slides; export the 20-slide deck and synchronized film.
- [x] Correct slides 13 and 19 to use an explicit left-to-right English flow; update the editable deck and synchronized film.
- [x] Reverse the chart layouts highlighted on slides 13, 14, and 19; retain left-to-right arrows and update the synchronized film.
- [x] Finalize the highlighted English charts from left to right: source/input on the left and outcome/decision on the right; update the deck and film.
- [x] Deliver the project SRS document in English (faster than Arabic version)
- [x] Replace demo "Recent activity" on dashboard with the signed-in user real notifications
- [x] Set up email infrastructure for notify.insightsettle.com
- [x] Deliver each SAMA sandbox answer as a separate Word file within its character limit

- [x] Batch B: one USD marginal fee calculator, fee-payer split with per-party VAT, balanced FX-B ledger, server-only deal actions, payout-currency check, new-deal defaults.
- [ ] Owner/pricing: confirm provisional USD fee bands and VAT treatment (legal review).
- [x] Public pricing/services calculators now share the existing live USD-based pricing adapter; no duplicated fee logic.

- [x] Daily: sync deals.amount numeric(18,3) in migration files; verify new-deal form (goods + contracting) as supplier.
