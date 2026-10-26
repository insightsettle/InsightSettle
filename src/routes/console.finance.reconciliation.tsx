import { createFileRoute } from '@tanstack/react-router';
import { FinancePage, financeOptions } from '@/components/finance/FinanceCenter';
import { financeHead } from '@/lib/finance/head';
export const Route=createFileRoute('/console/finance/reconciliation')({head:()=>financeHead('Statement reconciliation','Controlled sandbox CSV comparison and immutable exceptions review.'),loader:({context})=>context.queryClient.ensureQueryData(financeOptions()),component:()=> <FinancePage section="reconciliation"/>});