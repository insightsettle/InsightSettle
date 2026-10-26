import { createFileRoute } from '@tanstack/react-router';
import { FinancePage, financeOptions } from '@/components/finance/FinanceCenter';
import { financeHead } from '@/lib/finance/head';
export const Route=createFileRoute('/console/finance/routing')({head:()=>financeHead('Routing simulation','Sandbox versioned routing proposals and safe retry decisions.'),loader:({context})=>context.queryClient.ensureQueryData(financeOptions()),component:()=> <FinancePage section="routing"/>});