import { createFileRoute } from '@tanstack/react-router';
import { FinancePage, financeOptions } from '@/components/finance/FinanceCenter';
import { OverviewProviders, SectionIntro, providersOptions } from '@/components/finance/ProviderManagement';
import { financeHead } from '@/lib/finance/head';
export const Route = createFileRoute('/console/finance/')({
  head: () => financeHead('Financial overview', 'Sandbox banner, routing mode, providers, approvals and currency-separated totals.'),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(financeOptions()), context.queryClient.ensureQueryData(providersOptions())]),
  component: () => <div className="mt-6 space-y-6" data-no-localize>
    <SectionIntro en="One screen for routing mode, providers and their jobs, pending approvals and totals by currency (never mixed)." ar="شاشة واحدة لوضع التوجيه والمزوّدين ومهامهم والموافقات المعلّقة والإجماليات حسب العملة (دون خلط)." />
    <OverviewProviders />
    <FinancePage section="overview" />
  </div>,
});
