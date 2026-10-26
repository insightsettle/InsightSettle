import { createFileRoute } from '@tanstack/react-router';
import { FinancePage, financeOptions } from '@/components/finance/FinanceCenter';
import { financeHead } from '@/lib/finance/head';
export const Route=createFileRoute('/console/finance/providers')({head:()=>financeHead('Provider registry','Unconnected candidates, evidence and sandbox capability matrix.'),loader:({context})=>context.queryClient.ensureQueryData(financeOptions()),component:()=> <FinancePage section="providers"/>});