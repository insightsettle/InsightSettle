<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Architecture decisions
- Staff operational interventions use service-only audited RPCs after the shared staff guard; legacy controls call the same RPCs so audit and dispute restrictions cannot be bypassed.
- Auction fee settings feed only new auction quotes through a pure auction adapter; accepted splits change only before funding with new term versions, preserving prior snapshots and consumed quotes.
- Account state is serialized with deal creation and funding through profile-row locks; funding checks account state, freeze and deadline before consuming a quote, while suspended sign-in and confirmation of previously reserved provider payments remain available.
- Milestone editor convenience allocation and retention opt-in serialization live in a browser-safe form helper; server validation and financial allocation stay authoritative and unchanged.
- Mobile party labels use a browser-independent Dart role table and localized placeholder expansion; screens retain buyer/seller identifiers and existing action rules so copy cannot change authorization or pricing.
- Homepage contact requests use a dedicated validated public server function and a fixed-recipient managed email template; no contact queue or email tables are created, preventing arbitrary-recipient sending.
- Positive currency inputs share moneyInputStep for minimum and step so native validation uses an aligned minor-unit base.
- Auction shipping and delivery reuse goods party actions with server-authorized organiser shipping access; buyer acceptance reuses the existing split-release branch, and shared completion controls serve both auction surfaces.
- Staff business and demo payout verification reuse the existing staff guard and append explicit actor/time audit records; live payout verification cannot substitute a simulated provider check.
- Staff auction tabs use the shared staff guard and paginated read-only projections; authenticity copy maps to the existing quality-issue dispute flow so decision and payment logic remain unchanged.
- Auction client screens reuse existing winner, invite, decline, quote and funding actions; authenticated CRUD remains RLS/trigger-governed, supplemental read adapters authorize lot access before projecting metadata, and owner screens are read-only so presentation cannot alter settlement rules.
- Auction inspection countdowns derive display eligibility from deal status, not a retained deadline alone, so closed deals cannot appear to have active inspection without changing stored deadlines or release rules.

- Auction invariants live in database triggers with auction/lot row locks and immutable funding reservations; tests execute the migration in isolated PostgreSQL-compatible PGlite so writes cannot bypass bidder, split or deadline guards.
- Auction offers, expiry/decline advancement, invite claims and quote/funding reservations are service-only atomic database functions locking auction then lot then deal; deadline races use independent PostgreSQL sessions, and the existing managed callback runs the deadline sweep without adding a schedule.
- Auction payouts are created atomically by the service-only create_auction_release database function; settlement confirms immutable owner/organiser legs independently and writes direct payable ledger accounts, while ordinary deal settlement remains unchanged.

- All displayed language state is owned by the shared locale provider; this keeps English/Arabic selection and document direction consistent across public, customer, and staff views.
- All fee, VAT, FX pay-in and ledger figures come from src/lib/fees.ts via src/lib/pricing.server.ts and are locked in fx_quotes.breakdown at funding; screens only display server results so quote, invoice, release and ledger always agree.
- Parties never write deals directly (no party UPDATE policy + enforce_deal_transition trigger); every party step is a server function in src/lib/deal-party.functions.ts that checks side and status.
- Dispute releases are identified by their decision key and recomputed from locked pricing plus that decision, never from a net transaction amount; this prevents confirmation from paying the whole deal or charging fees twice.

- Authenticated client chrome is owned by the pathless client layout and shared AppShell; SiteShell omits public chrome there, while ConsoleShell supplies staff navigation to AppShell, keeping all routes and actions unchanged.
- Client layout helpers in DealPresentation and deal-display are presentation-only; they reuse server pricing and existing action eligibility without authorizing mutations or calculating new charges.
- Legacy milestone event labels are classified from matching payment records only in presentation, and explicit bilingual event text bypasses DOM translation so asynchronous record loading cannot restore obsolete labels.

- Staff overview reads are paginated and guarded by the existing staff authorization; reconciliation must mark provider balance unverified without an independent provider statement, never infer a match from internal ledger data.
- The staff status control routes cancellation to the existing staff cancel action; other statuses retain the existing setter so financial and permission checks remain server-owned.
- Public pricing shares one display component and reuses loadPricingInputs/dealFee/splitFee via a validated read-only server function; anonymous pricing reads respect existing RLS and show unavailable rather than fallback or bypass blocked access.

- Customer layouts wait for existing staff-access resolution and redirect staff to the console before mounting customer children, preventing onboarding flashes and customer phone tabs.
- Restored financial breakdowns and milestone schedules remain uncollapsed; phone milestone rows reflow within the same panel so controls use unchanged server actions and pricing.

- Authentication pages use AuthShell, separate from public/customer chrome, with the shared locale provider so recovery screens stay branded and bilingual for signed-out and recovery sessions.

- Auth follow-up pages use un-nested route IDs while preserving /auth/* URLs; the sign-in page is content, not a layout, so its redirect must not swallow recovery and confirmation pages.
