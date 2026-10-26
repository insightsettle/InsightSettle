import { createFileRoute, Outlet } from '@tanstack/react-router';
import { financeHead } from '@/lib/finance/head';
export const Route=createFileRoute('/console/finance/transactions')({head:()=>financeHead('Transactions','Insight normalized sandbox transaction records.'),component:()=> <Outlet/>});