import { createFileRoute } from '@tanstack/react-router';
import { ProvidersGrid, providersOptions } from '@/components/finance/ProviderManagement';
import { financeHead } from '@/lib/finance/head';
export const Route = createFileRoute('/console/finance/providers/')({ head: () => financeHead('Payment providers', 'Sandbox payment providers, their status and assigned jobs.'), loader: ({ context }) => context.queryClient.ensureQueryData(providersOptions()), component: ProvidersGrid });
