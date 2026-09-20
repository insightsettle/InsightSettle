# Real client & admin workspaces

Today both dashboards look alike and mostly show sample numbers. This work makes the admin area a true control room over real data, and gives the client everything they need to act on a deal.

## Admin area (/console)

New tab **Users**
- Every registered person: name, phone, email, verification state, join date, number of deals, total value.
- Actions: approve or reject identity verification, grant or remove Insight-team access.

New tab **Deals** (real deals, not samples)
- Full list of every deal created on the platform with who created it, both parties, amount, currency, status, due date, created date.
- Search by reference, title, or party; filter by status.
- Deal detail view for staff: complete data, both parties' contact details, full activity log, notes.
- Change the deal status directly (funding, held, delivered, under review, released, refunded, disputed) with a required reason that is written into the deal log.
- Special-fee offer: for a high-value deal, set a custom fee (percentage or fixed amount) plus a note. The client sees the discounted fee on their deal page.
- Staff can post a message into the deal conversation as "Insight support".

Overview tab keeps the existing KPIs but now counts real deals and real registered users alongside the sample analytics.

## Client area

Deal page gains, for each deal:
- **Timeline** built from the real activity log of that deal (created, party joined, funded, delivered, released, status changes, staff actions).
- **Release funds** button for the buyer when the deal is delivered/under review, with confirmation.
- **Confirm delivery** button for the seller when the deal is funded.
- **Request arbitration / open a dispute** with a written reason; the deal moves to disputed and appears in the admin queue.
- **Deal conversation**: the buyer, the seller, and Insight support write messages on the deal, newest last, with sender name and time.
- **Contact Insight** note box that files a support note visible to staff on the deal.
- Fee panel shows the special fee when staff has granted one.

Dashboard keeps real saved deals but adds the live status badge and what action is waiting on the client.

## Technical notes

Database (one migration):
- `deal_messages` (deal_id, author_id, author_kind `party` | `staff`, body) — readable by the deal's parties and staff, writable by parties and staff.
- `deal_fee_offers` or fee columns on `deals`: `fee_override_percent`, `fee_override_flat`, `fee_override_note`, `fee_override_by` — only staff write, parties read.
- `deals.status` gains a check-free validation trigger for the seven allowed values; add `disputed_reason`, `released_at`.
- `profiles` gains a staff-readable policy via `has_role(auth.uid(),'admin')`, and admins get read access on `deals`, `deal_events`, `deal_messages`.
- `user_roles` gains admin-managed insert/delete policies routed through server functions only.

Server functions:
- `src/lib/admin.functions.ts` — `listPlatformUsers`, `setVerificationStatus`, `setStaffRole`, `listAllDeals`, `getDealForStaff`, `setDealStatus`, `setFeeOverride`, `postStaffMessage`. Each verifies `has_role(userId,'admin')` through the caller's own client before loading `supabaseAdmin`.
- `src/lib/deal-actions.ts` (client-side, RLS-scoped) — `confirmDelivery`, `releaseFunds`, `openDispute`, `postMessage`, `listMessages`, plus each action appending a `deal_events` row so the timeline stays truthful.

New routes: `src/routes/console.users.tsx`, `src/routes/console.deals.tsx`, `src/routes/console.deals.$dealId.tsx`, registered in the console tab bar.

All money remains marked as sample data until a payment provider is connected; release/refund change deal state and the log only.
