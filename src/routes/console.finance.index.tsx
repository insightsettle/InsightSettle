import { createFileRoute } from '@tanstack/react-router';
import { FinancePage, financeOptions } from '@/components/finance/FinanceCenter';
import { financeHead } from '@/lib/finance/head';
export const Route=createFileRoute('/console/finance/')({head:()=>financeHead('Financial overview','Currency-separated simulated transaction totals and source limitations.'),loader:({context})=>context.queryClient.ensureQueryData(financeOptions()),component:()=> <FinancePage section="overview"/>});