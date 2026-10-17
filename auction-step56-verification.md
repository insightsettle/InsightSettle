# Auctions steps 5–6 verification

## Step 5
- `/console/auctions` added under Operations, Arabic/English labels through `text()`.
- Organisers, lots, expired/declined offers and auction-only disputes use the existing staff guard and shared console components.
- Lot tooltip: standard fee table, paid by the winner; no new auction fee rule.
- Auction authenticity wording maps to the existing `quality_issue` reason. Existing resolution flow and four-eyes behaviour unchanged.
- Temporary private random staff password set through the admin auth API, sign-in through `/auth`, then replaced with a new private random password in cleanup. No secrets printed.
- All four tabs checked signed in. Arabic screenshot reviewed: `/tmp/browser/auction56/console-auctions-ar.png`. Mobile viewport 390 × 844: no page overflow.
- Automatic type/build log: build OK (2026-10-17 22:11:51 UTC).
- 74 tests passed, including the three new console rules tests and T22 settlement/guard regression tests. Ten actual independent PostgreSQL tests were not executed: local database initialization fails to locate PostgreSQL shared libraries. This is not a passing concurrency result.
- Existing `/auth` hydration warning remains observed; auction console renders successfully after sign-in.

## Step 6 — stopped at prerequisite check
No new deal reference. No party actions or financial data edits were performed.

Existing accounts are a Saudi individual buyer, a verified Bahrain business supplier with BHD payout, and staff. There is no verified Saudi organiser with SAR payout or Kuwait buyer. The existing console has identity approval but no business-profile or payout-account verification action; creating accounts alone cannot establish the required verified SAR beneficiaries through the allowed UI flow. Direct data edits were not used to bypass this.

Further source inspection found the auction winner screen has payment/decline/dispute but no acceptance/release controls. This remains a separate blocker, not a verified runtime failure or an implemented fix.

| Check | Preview result | Automated regression result |
| --- | --- | --- |
| T22-a complete SAR 48,000 lot | BLOCKED before creation | PASS: fee 845.63, buyer VAT 0, owner 40,800, organiser 7,200, independent confirmations, balanced ledger/held zero |
| T22-b split change after first bid | NOT ATTEMPTED because run stopped | PASS: actual migration guard refuses locked split change |
| T22-c unverified owner lot opening | NOT ATTEMPTED because run stopped | PASS: actual migration guard refuses opening |

Quote/invoice equality, per-currency held balance, two idempotency keys, complete timeline and final-deal screenshot are **not preview-verified**. DL-11339 visible in the console screenshot is the earlier BHD step-4 deal, not this requested T22 run. No final deal screenshot was taken.

## Changed files
- `src/routes/console.auctions.tsx`
- `src/lib/staff.functions.ts`
- `src/lib/auction-console-display.ts`
- `src/lib/auction-console-display.test.ts`
- `src/components/site/ConsoleShell.tsx`
- `src/components/site/StaffOps.tsx`
- `src/components/site/DealExtras.tsx`
- `src/components/auction/AuctionWinner.tsx`
- `AGENTS.md`, `roadmap.md`, this report

No publishing, migration or financial-rule changes.