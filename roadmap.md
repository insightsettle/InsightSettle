# Roadmap
- [ ] C09-D26: correct only acceptTerms/updateShipping load arguments, add authorization regression, run tests once, then resume DL-44255 shipping/delivery/acceptance and T22-b/c; no repeated funding, data patches or publishing; invalidate passwords.
- [x] C09-D25: align auction and public calculator money input minimum/step; SAR 48000 and BHD 1000.500 regression passes. 82 tests passed, 10 skipped; preview build OK; no publishing.
- [ ] T22 continuation: existing lot 08ff680a-3b38-48f9-ba3c-5314f026f742 recorded winner/backups at SAR 48000/47000/46000; DL-44255 funded through winner UI. Stopped at real organiser Mark shipped refusal: “تعذّر تنفيذ الإجراء. حدّث الصفحة وتحقق من حالة القطعة.” Deal held/preparing, owner/organiser allocations 40800/7200 with no release transactions or keys; SAR escrow_held 48000, debit-credit 0; INV-1004 matches locked fee 845.63 and VAT 0. T22-a failed; b/c not attempted. All temporary passwords invalidated; final Arabic screenshot reviewed. Blocker: shipping action needs a separately authorized fix before further party actions.
- [x] Add shared auction shipping/delivery/inspection acceptance controls using existing actions and direct split settlement; add audited staff business/demo-payout verification. 81 tests passed, 10 PostgreSQL race tests skipped without retrying setup; automatic type/build clean. Production-flow verification remains incomplete because the single allowed T22 run stopped during setup.
- [x] Auctions step 5: read-only console Auctions tabs, auction-only authenticity reason using existing dispute flow, one Arabic staff screenshot reviewed; 74 tests passed, automatic type/build clean; staff temporary password invalidated; no publishing. Ten independent PostgreSQL tests could not run because this sandbox's PostgreSQL library setup fails before initialization.
- [ ] Auctions step 6: single allowed T22 run stopped at first failure — fictional organiser payout submission rejected an invalid generated IBAN. Five fictional auth accounts created; only organiser personal/business details saved through UI. All five temporary passwords invalidated. No payout saved, identity evidence submitted, staff approvals, auction, deal or money movement. T22-a blocked; b/c not attempted; no final screenshot. Resumption needs owner permission for a fresh run with valid fictional input, not patched data.
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
- [ ] UX-B live-summary fee figures: existing new-deal form has no server price preview. Requires permission to add a server preview (excluded by presentation-only scope); show unavailable values rather than invent pricing.
- [ ] UX-B contracting screenshot/approval-state verification: DL-14746 exists but is cancelled, has no buyer, and is inaccessible to the requested buyer account. Requires an accessible contracting deal; no test deal or party writes were created.

- [x] UX-A: apply v1 tokens, bilingual client/staff shells, statuses, cards/tables; verify automatic type check/build and 31 unit tests. No publishing or business logic changes.
- [ ] UX-A signed-in EN/AR dashboard and console screenshots (maximum three): blocked by unavailable test-account session approval; owner must sign into the preview. No screenshots taken or mock sessions used.

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
- [ ] Public pricing/services calculators still use the old SAR bands (marketing copy frozen) — align when copy may change.

- [x] Daily: sync deals.amount numeric(18,3) in migration files; verify new-deal form (goods + contracting) as supplier.
