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