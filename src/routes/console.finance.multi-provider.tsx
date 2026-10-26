import { createFileRoute } from '@tanstack/react-router';
import { MultiProviderPanel, routingConfigOptions } from '@/components/finance/MultiProvider';
import { financeHead } from '@/lib/finance/head';
export const Route = createFileRoute('/console/finance/multi-provider')({
  head: () => financeHead('Price book & routing', 'Sandbox multi-provider price book, routing table, route simulator and coverage matrix.'),
  loader: ({ context }) => context.queryClient.ensureQueryData(routingConfigOptions()),
  component: MultiProviderPanel,
});
