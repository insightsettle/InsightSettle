# Insight Financial Operations Center

## Inspection (26 October 2026)
- TanStack Start/React routes in `src/routes`, Vite configuration in `vite.config.ts`; managed Lovable Cloud database reachable via read-only inspection. Repository checkout is Lovable-managed; user reports GitHub main sync, but direct GitHub remote connectivity is not independently verified from this checkout.
- Existing console parent `src/routes/console.tsx` owns sign-in/access gating and `ConsoleShell`/`AppShell`. `staff-auth.server.ts` and `staff-levels.ts` already implement read/support/finance/admin capabilities without MFA. Reuse these, not a new auth system.
- Financial source tables verified in the database: `deal_transactions`, `deals`, `fx_quotes`, `ledger_entries`, `tax_invoices`, `deal_milestones`, `deal_payout_splits`, `disputes`, `deal_events`, `audit_logs`. Migrations are in `drizzle/migrations`; latest numbered existing migration is 0029. Some earlier numbers have multiple historical files: preserve them.
- `fees.ts`, `payment-methods.ts`, `pricing.server.ts` own existing pricing. D-66 payment method pricing and PROVIDER_COST are reference inputs, not verified actual provider fees. Do not change these.
- `payments.functions.ts`, `operations.functions.ts`, `settlement.server.ts`, `auction-settlement.server.ts` and `milestones.server.ts` already own money operations, idempotency and two-person dispute releases. `0024_no_admin_deal_bypass.sql` prevents direct authenticated staff money-state changes. Preserve these boundaries.
- Existing simulated confirmation/callback: `settlement.server.ts` and `src/routes/api/public/auto-release.ts`. `payment-provider.server.ts` incorrectly labels a Stripe secret as a connected provider without verified integration: remove this implicit activation to enforce founder sandbox-only decision.
- Existing currency helper uses numeric display/legacy pricing; new operational totals will instead read PostgreSQL numeric as decimal strings and aggregate exact minor units, without rewriting existing pricing.
- Existing tests are `src/lib/*.test.ts` (Vitest/PGlite). CSV export already neutralizes spreadsheet formulas in `src/lib/csv.ts`.

## File-specific implementation order
1. `src/lib/finance/providers.ts`, `money.ts`, `routing.ts`, `reconciliation.ts`: browser-safe capability evidence, exact currency arithmetic, sandbox routing and deterministic report matching. Candidate adapters have no invented endpoints.
2. Add one tool-managed migration: read-only normalized transaction view with numeric values cast to strings, currency-separated aggregate reporting, append-only operational records and a service-only, role-checked idempotent append RPC. These supplement, never replace, the ledger or transaction tables.
3. `src/lib/finance.functions.ts`: authenticated reads, paginated transactions, source-linked detail, report upload, metadata proposals/independent approval, routing simulation, audit exports. Every privileged handler first uses the shared staff guard.
4. `src/components/finance/*` and `src/routes/console.finance*`: overview, transactions/detail, providers/capability matrix, refunds/disputes, reconciliation/exceptions, routing simulation and monitoring, inside existing console. `ConsoleShell.tsx` gets minimal links only.
5. `src/lib/finance-*.test.ts`: precision, capability gates, candidate restrictions, ambiguous outcomes/no failover, reconciliation differences/duplicates, role and independent-approval/idempotency tests. Existing integrity tests remain authoritative for posted money.
6. `docs/finance-center/STATUS.md`: actual tests and UI verification, environment/secrets, simulated vs implemented vs blocked features.

## Safety and data model
Operational records are immutable metadata, not payment authorization. Approved provider/routing settings affect Finance Center simulations only; they do not reroute existing customer payments. Money-action links use existing guarded deal/dispute controls. No new capture/refund/payout executor or real webhook is introduced without verified provider specifications. No imported statement can mark a transaction paid, settle a deal or change a posted ledger.

Provider and bank balances are unavailable. Internal confirmed simulated funding is not bank cash. A reconciliation match means exact agreement with an imported report row, not independently authenticated provider evidence. Preserve original allow-listed CSV columns and matching outcomes; manual resolution requires a reason and evidence reference and leaves originals intact.

Staff read accesses use existing capability `read`, imports/resolution/export use `finance`, provider/routing proposals and independent approvals use `admin`. All writes require a reason; append RPC independently verifies staff role level, locks requests, rejects self/duplicate approval and uses unique per-actor idempotency keys. It also appends to existing `audit_logs` through `staff_control_audit`.

Live operations are disabled in code, not enabled by credential presence. No production registry environment or credential entry is exposed. Future integrations require official APIs, merchant eligibility, signature verification, partner custody approval, independent sandbox tests and explicit founder authorization. No new credentials are required in this run.