# Finance Center status — 26 October 2026

## Delivered in this run
| Area | Status | Boundaries |
|---|---|---|
| Architecture inspection | Implemented | See ARCHITECTURE.md; existing staff model, tables, callbacks and pricing inspected. |
| Provider registry/capability matrix | Implemented as candidate catalogue | AFS, Tap, lite, Geidea are NOT CONNECTED; commercial evidence is not API verification. Only existing `manual` simulation is executable. |
| Sandbox adapter contract | Implemented | Status retrieval returns internal simulated status, explicitly not provider-authoritative. Unsupported capture/void, live refunds/payouts/escrow remain disabled. |
| Normalized transactions | Implemented | `finance_transactions` projects existing rows with PostgreSQL numeric amounts/fees as strings; no transaction or ledger rewritten. Existing rows are treated as sandbox per founder environment facts. |
| Console overview/register/detail | Implemented, authenticated UI unverified | Filters, page-based currency totals, paginated register, source-linked deal history/invoices/ledger/audit, source-status refresh. Current-page totals are explicitly labelled; not full-period KPIs or bank balances. |
| Refund/dispute queue | Implemented read/link layer | Internal disputes and current transaction-page refunds; actions link to existing two-person controls. No external chargeback APIs. |
| Reconciliation | Implemented/tested pure matching and controlled server persistence | CSV template up to 200 rows/100 KB; retained original controlled columns, exact amounts, duplicate/missing/ambiguous/currency/status/fee exceptions; evidence/reason-required review does not settle money. Split/partial settlement and fees need manual review. |
| Routing | Implemented simulation only | Country/currency/method/amount gates; unknown/succeeded previous outcome blocks retries; versioned proposals, load latest approved version, propose older configuration as a new revision for rollback. Customer payment routing unchanged. Approved provider disable enforced server-side in simulation. No automatic multi-provider failover. |
| Maker-checker and audit | Implemented; PGlite integration tested | Two distinct admins approve configuration metadata. Per-actor idempotency keys, payload-conflict checks, advisory/request locks, unique approval index, existing staff audit RPC. Existing financial approvals unchanged. |
| CSV export | Implemented | Transactions export max 5,000 selected-period rows, audited with reason; existing formula-safe CSV helper. Reconciliation-results download is local and not separately audited. |
| Monitoring | Implemented limited source view | Simulated pending/failed current-page operations. External availability, API latency, webhook health, synchronization, real balances/settlements and credential expiry unavailable; no fabricated metrics or jobs. |

## Actual verification
- New pure/contract tests: **25 passed** in `finance-center.test.ts` (precision, candidates, capability gates, no live mode, safe retry, amount limits, exact matching, duplicate and fee exceptions).
- New isolated PostgreSQL-compatible integration tests: **4 passed** in `finance-records.test.ts` using the actual new migration's record/RPC SQL. Covers idempotent replay/conflict, separate approver, duplicate approval refusal, viewer denial, live proposal denial and append-only service privileges. These are NOT provider sandbox tests.
- Full Vitest suite: **190 passed, 10 skipped**, 33 passing files, one skipped file. Skips are existing independent database-race tests. Existing fee/payment-method/settlement/milestone/auction regressions pass.
- Automatic build/typecheck latest verification: **build OK**, 26 October 2026 22:53:29 UTC. No manual build was invoked (managed verification).
- Live localhost browser attempted existing fictional `admin@insightsettle.com` login; it stayed on `/auth` and `/console/finance` redirected to sign-in. No runtime page errors appeared in that signed-out check. Managed `--self` session had no matching requesting-user account; explicit admin session mint was unavailable without approval. Therefore authenticated UI, 375px/1280px layout, uploads, approvals and export E2E **are not verified**. No bypass, forged role, impersonation or account changes were used.
- New normalized view existence verified through hosted database metadata. No demo reset, transaction creation, money actions or old-row updates/deletes performed in this run.

## Migration blocker
The first additive migration applied successfully as tool-generated `0026_finance_operational_center.sql`. Existing journal numbering trails filenames through 0029. A second planned migration for full-period exact SQL totals and ledger/invoice numeric-string projections failed before execution: newly generated 0026 snapshot collides with pre-existing 0027 snapshot parent. The snapshots are managed/read-only; no historical files were edited. The second migration was not applied, and application code does not depend on it.

Until managed migration history is repaired, overview totals remain **page-only**, and detail ledger/invoice numbers arrive through existing numeric JSON projections. Decimal.js prevents additional binary arithmetic in the detail display but cannot recover precision already lost by an existing numeric transport. The normalized transaction amount/fee view is exact. Full numeric-string accounting projections are an explicit remaining requirement, not declared complete.

## Environment variables and credentials
- No new variables or provider credentials required for delivered sandbox features.
- Existing managed browser/server auth settings and bearer middleware remain unchanged.
- `STRIPE_SECRET_KEY`, if present, no longer implicitly marks a provider connected. Credential presence alone cannot activate any live flow.
- Live payments/refunds/payouts/real-provider escrow gates are false in `finance/providers.ts`; changing secrets cannot enable them.
- Future private provider credentials must be added via Project Settings → Secrets only after official integration specifications and approval. Never enter credentials in registry forms or uploads. No invented provider URLs, signatures, SDK calls or credential rotation mechanisms are supplied.

## Sandbox test instructions
1. Sign in with an eligible existing staff account; open `/console/finance` using the existing Finance navigation.
2. Review page/period/currency labels and unavailable bank/provider balances. Search an existing populated transaction and open its detail; compare source invoices and ledger.
3. Propose a sandbox provider or routing setting with a reason; another admin approves. The proposer cannot approve their own request. Load approved rule and simulate a candidate/unknown previous outcome; it must block and never execute payment.
4. Download reconciliation template. Use fictional reference rows only. Upload one known exact reference, a duplicate, a mismatch and an unknown reference. Confirm immutable exception outcomes; add evidence and reason for manual review. Fee-bearing rows remain exceptions until verified evidence exists.
5. Export a bounded period with a reason and verify the existing audit log. Viewer/support users must be refused finance mutations server-side.
6. Do not reset or change completed deals to manufacture test data. Use existing fictional records or separately approved test fixtures.

## Remaining and blocked
- Authenticated E2E + bilingual phone/desktop visual verification: needs a usable demo sign-in or approved staff preview session.
- Full-period source totals, exact ledger/invoice transport, richer liabilities/settlement reports: blocked by managed migration snapshot collision.
- Persisted arbitrary-provider creation, per-capability overrides, connection tests/rotation, production configuration: deferred; no official documentation/credentials or live authorization. Current candidate set is intentionally fixed.
- Durable provider event queue, signed webhooks/replay/order recovery, safe synchronization retries: pending verified adapter specifications. Existing simulated callback untouched.
- New financial executors, provider-confirmed refunds/capture/void/payouts, automatic routing/failover, configurable money thresholds: not implemented; existing workflows/approvals remain the only routes.
- Provider/bank reconciliation authenticity, automated statement fetches, splits/fees/batch settlement matching, automated alerts: pending data access/specifications and expanded additive schema.
- Live escrow/custody: pending licensed partner, eligibility and regulatory/legal approval; disabled. This delivery does not establish production readiness.

Nothing published. Public header/site and `mobile/` unchanged.
## Multi-provider routing (27 Oct 2026)

### Business rule enforced in code
**One deal = one provider, from pay-in to payout.** The route is chosen once per deal, before funding, and must satisfy both legs (payer country, pay-in currency, payment method AND payee country, payout currency) with the same provider. Legs are never split; if no single provider serves both, there is no route.
- `fx_quotes.route_provider / route_rule_version / route_reasons` record the route on every new quote.
- Trigger `deal_transactions_route_lock` copies the quote's route onto `deals.route_*` at the first funding.
- Trigger `deals_route_lock` refuses any later change of a deal's provider or rule version; trigger `fx_quotes_route_guard` refuses a quote whose provider differs from the deal's locked provider. Milestones, retention, refunds and auction split payouts therefore stay with that provider.
- Deals funded before routing existed are treated as locked to the simulated provider.
- `platform_settings.cross_provider_settlement` exists as a future flag; a CHECK constraint keeps it `false` (pending approval).

### What works (sandbox)
| Item | Status |
|---|---|
| Versioned price book (`src/lib/finance/price-book.ts`) | Seed rows for lite (verbal), Geidea (written), Tap (reference, bank transfer not offered), AFS (awaiting quote), simulated provider (former `PROVIDER_COST`). Edits = `price_book_proposal` records, approved by a second admin; append-only. |
| Routing table | Seed rules R1–R5 (lite mada; cheapest card; lite bank transfer; AFS outside SA/SAR; simulated fallback). Enable/disable and roll back are new `routing_table_proposal` revisions. |
| Eligibility | Pay-in method/country/currency, payout corridor, max holding days (lite mada 14), max per payment, capability not unavailable. Unverified candidates are flagged "unverified · sandbox only". |
| `checkMethod` (D-66) | Optional routed provider cost; no route ⇒ method not offered with the existing reason text. Customer fee, caps and texts unchanged; provider names never shown to customers. |
| `routing_mode` | `simulated_only` (default, unchanged behaviour) or `price_book_sandbox`; switched only through an approved `routing_mode_proposal`. Public pricing page always uses the simulated behaviour. |
| Console `/console/finance/multi-provider` | Mode, pending proposals with second-admin approval, price book editor, routing table, simulator with the six founder cases, coverage matrix. |

Holding days = inspection days + defects-liability days when retention is held (no delivery period column exists yet; simulator accepts any number).

### Founder test cases (seed configuration, tested)
| Case | Route | Cost / margin |
|---|---|---|
| SAR 2,000 mada SA→SA | lite (R1) | SAR 17 · 1.65% — offered |
| SAR 20,000 credit card SA→SA | lite, cheapest (R2) | SAR 450 · 0.25% — **not offered** (below 0.5%) |
| SAR 550,000 bank transfer SA→SA | lite (R3) | SAR 0 · fee capped SAR 13,125 (2.39%) |
| SAR 20,000 mada, 30 days | not lite (hold 14) → simulated fallback | — |
| BHD 55,000 bank transfer BH→SA | AFS rejected (awaiting quote; payout to SA not in corridor) → simulated fallback | — |
| SAR 100,000 contracting, 12-month retention | mada: simulated fallback (lite hold too short); credit card: over SAR 50,000 limit | — |

Note: with these prices, cards at SAR 20,000 fail the 0.5% rule for every candidate. That is a commercial finding, not a bug.

### Tests
`src/lib/multi-routing.test.ts`: 16 passed (founder cases, cap, cheapest, no split legs, locked deal, approved-only config, simulated_only unchanged, PGlite: self-approval refused, immutable records, route lock triggers, cross-provider flag stays OFF). Full suite: **206 passed, 10 skipped**. Build OK. Authenticated console UI not verified in a browser in this run.

### Simulated / waiting for providers
- Only the simulated provider executes; lite, Geidea, Tap, AFS remain NOT CONNECTED.
- Waiting: lite written quote (and hold period for cards/wallet), AFS quote, corridors and specifications, Tap marketplace/split-payout answers, Geidea payout and hold terms.

### Migration numbering fix
Snapshot files were out of step with the journal (`0027_snapshot.json` belonged to journal idx 25 `0027_market_survey`, and two snapshots shared a parent). Only metadata was changed: `0027_snapshot.json` renamed to `0025_snapshot.json` and the `prevId` chain re-linked (0024 → 0025 → 0026). No applied SQL file or data was edited or dropped; `drizzle-kit check` passes. The tool names migrations by journal position, so the new file is `0027_multi_provider_routing.sql` (it sits next to the older `0027_market_survey.sql`; different tags, no collision). It applied successfully.

## Finance Center reorganised around providers (27 Oct 2026)

### New structure (`/console/finance`)
| Section | URL | Contents |
|---|---|---|
| Overview | `/console/finance` | Sandbox banner, routing mode, provider strip with job chips, pending approvals and reconciliation counts, totals by currency |
| Providers | `/console/finance/providers` | Card grid + "Add provider". Provider page `/providers/$providerId` with tabs Profile, Connection (API), Jobs & coverage, Prices, Limits & holding, Activity |
| Routing | `/console/finance/routing` | Mode, warnings, ordered rules, route simulator (six founder cases), coverage matrix |
| Transactions | `/console/finance/transactions` | List/detail; each row shows routed provider and rule version |
| Operations & approvals | `/console/finance/operations` | Approvals inbox (all proposal types; approve/reject with reason; proposer cannot approve) + refunds/disputes queue |
| Reconciliation | `/console/finance/reconciliation` | Unchanged |
| Reports & monitoring | `/console/finance/reports` | CSV export + provider health |

Old URLs redirect: `/queue` → `/operations`, `/monitoring` → `/reports`, `/multi-provider` → `/routing`.

### Real vs stubbed
| Item | Status |
|---|---|
| Provider profile, rename (EN/AR), status, archive, add provider | Real (sandbox). Proposal + second-admin approval. Codes fixed; archive blocked while an enabled rule pins the provider or an unused quote is routed to it; never hard-deleted. |
| Jobs & coverage per provider | Real. Routing uses jobs + price book. Turning a job off affects only new routes; funded deals keep their provider. |
| Limits & holding | Real (max per payment, daily limit stored, settlement days stored, max hold per method). Daily limit and settlement days are recorded only; not yet enforced. |
| Credentials | Real storage: AES-GCM encrypted in `finance_provider_credentials` (service role only), key `FINANCE_CREDENTIAL_KEY` (server secret). Browser receives only `••••last4`, who and when. Set/replace/remove are proposals; active only after a second admin approves. Sandbox only; production credentials refused. |
| Test connection | Simulated adapter: internal check. lite, Tap, Geidea, AFS, generic: stubs return "Adapter not built yet: waiting for the provider's official API documentation" (never success). Every test is recorded. |
| Webhook URL | `/api/public/finance-webhook/{code}/{sandbox|production}` exists and refuses every request (501) without reading or storing it. |
| Holding / conditional release | Pending approval for every candidate; simulated only for the demo provider. |
| Production | Locked (`liveFlags` false); checklist shown on each provider page. |

Seeded jobs: lite mada + bank transfer On, credit card Off; Geidea credit card On, mada Off; Tap all Off; AFS all Off (awaiting quote); simulated all On. Effect: SAR 20,000 credit card now routes to Geidea (cost SAR 481) and still fails the 0.5% margin rule.

### What each provider must send before its adapter can be built
| Provider | Needed |
|---|---|
| lite | Written price quote (mada, cards, wallet bank transfer, hold periods); official API docs; sandbox merchant ID + keys; webhook spec (events, signature algorithm, retries); payout/refund API and settlement report format |
| Geidea | API docs for checkout, refunds and payouts; sandbox credentials; webhook signature spec; payout corridors and hold terms |
| Tap | Integration meeting outcome; marketplace / split-payout answers; API docs; sandbox keys; webhook spec |
| AFS | Price quote; supported methods, countries and currencies (incl. BenefitPay / Benefit debit); API docs; sandbox credentials; webhook spec; payout corridors |

### Migration
`0030_provider_management.sql`: credentials table, new proposal kinds (profile, jobs, limits, credential, rejection, connection test), approval/rejection logic, routed provider columns on the transaction view. The tool generated it as 0028; only the file name and its journal tag were changed to 0030 after it applied (applied-state tracking uses the journal timestamp, not the name). `drizzle-kit check` passes. 0026/0027 untouched.

### Tests
`provider-management.test.ts` (10) + updated `multi-routing.test.ts` (16): no secret returned, masked display, second admin activates credentials, stubs never succeed, job off vs funded deal, rename keeps code, archive blocked, founder seeds. Full suite: 216 passed, 10 skipped (existing database-race tests). Browser check signed in as admin: all sections at 375px and 1280px, no page errors, no horizontal page scroll; test connection on lite showed "Adapter not built yet".
