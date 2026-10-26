import { createFileRoute } from '@tanstack/react-router';
import { FinancePage, financeOptions } from '@/components/finance/FinanceCenter';
import { financeHead } from '@/lib/finance/head';
export const Route=createFileRoute('/console/finance/queue')({head:()=>financeHead('Refunds and disputes queue','Simulated refund records and internal dispute decision links.'),loader:({context})=>context.queryClient.ensureQueryData(financeOptions()),component:()=> <FinancePage section="queue"/>});