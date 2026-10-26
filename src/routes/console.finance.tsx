import { createFileRoute, Outlet } from '@tanstack/react-router';
import { FinanceNav } from '@/components/finance/FinanceCenter';
import { financeHead } from '@/lib/finance/head';
export const Route=createFileRoute('/console/finance')({head:()=>financeHead('Financial Operations Center','Insight sandbox financial operations and provider oversight.'),component:()=> <><FinanceNav/><Outlet/></>});