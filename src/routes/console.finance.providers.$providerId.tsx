import { createFileRoute } from '@tanstack/react-router';
import { ProviderPage, providersOptions } from '@/components/finance/ProviderManagement';
import { financeHead } from '@/lib/finance/head';
export const Route = createFileRoute('/console/finance/providers/$providerId')({ head: () => financeHead('Provider', 'Sandbox provider profile, connection, jobs, prices, limits and activity.'), loader: ({ context }) => context.queryClient.ensureQueryData(providersOptions()), component: ProviderRoute });
function ProviderRoute() { const { providerId } = Route.useParams(); return <ProviderPage code={providerId} />; }
