# Auction client screens — step 4

## Files
- Client screens: `src/components/auction/AuctionShared.tsx`, `AuctionForms.tsx`, `AuctionOrganiser.tsx`, `AuctionWinner.tsx`.
- Client reads: `src/lib/auction-client.ts`, `auction-client.functions.ts`; organiser summaries use authorized narrow projections, payout display reads the locked funding quote, owner amount reads the existing payout split.
- Routes: `_authenticated/auctions.tsx`, `auctions_.$id.tsx`, updated deal/invite/account routes and `ClientShell.tsx`.
- Applied migrations 0014–0017: account preference, auction date, private photo access, exact owner-email lookup, verified-business eligibility.
- Tests: `auction-client.test.ts`, `auction-business.test.ts`; architecture documentation updated in `AGENTS.md`.

## Verification
- 81/81 tests passed, including ten real PostgreSQL deadline/concurrency tests. Automatic type check and build: OK.
- Two Arabic screenshots reviewed: signed-in organiser with winner/two backups; signed-in winner showing countdown and complete pricing. No additional screenshots taken.
- `/auth` temporary-password method used for supplier and buyer; every temporary password invalidated in cleanup.
- Through UI: created auction and lot, recorded winner and two backups, followed invite, opened/cancelled decline confirmation, funded DL-11339, read paid status back in winner and organiser views.
- BHD 1,000.000 hammer; existing engine returned BHD 27.820 fee, BHD 4.173 VAT, BHD 1,031.993 total; SAR 10,400.55 pay-in. Owner read-only payout BHD 850.000 from stored split. No settlement or pricing logic changed.
- English organiser/winner and mobile checked: no horizontal page overflow.

## Limitations
- Reminder reached managed sending but the test recipient's first message bounced; subsequent send was suppressed with unreachable_mx. Sender domain verified. A reachable mailbox is required; suppression not bypassed.
- Existing auth page produced a saved-language hydration warning on sign-in; auction navigation and actions succeeded.
- Photo upload and email-owner selection were not exercised end-to-end.
- No publication. Simulated funding only; no real money moved. Test auction/deal remain for review.