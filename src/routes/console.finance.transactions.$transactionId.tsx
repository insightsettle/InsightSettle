import { createFileRoute } from '@tanstack/react-router';
import { FinanceDetail, detailOptions } from '@/components/finance/FinanceDetail';
import { financeHead } from '@/lib/finance/head';
export const Route=createFileRoute('/console/finance/transactions/$transactionId')({head:()=>financeHead('Transaction detail','Source-linked transaction timeline, invoice and simulated deal ledger.'),loader:({context,params})=>context.queryClient.ensureQueryData(detailOptions(params.transactionId)),component:()=> <FinanceDetail id={Route.useParams().transactionId}/>});