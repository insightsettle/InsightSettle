-- C09-D28 (N10): parties could insert dispute rows directly through the API, bypassing openDisputeCase
-- (one open dispute per deal/milestone, deal status, deadlines, notifications). Disputes are opened only
-- by the server function, which uses the service role.
drop policy if exists disputes_insert on public.disputes;
