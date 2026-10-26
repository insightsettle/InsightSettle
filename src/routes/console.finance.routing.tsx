import { createFileRoute } from '@tanstack/react-router';
import { MultiProviderPanel, routingConfigOptions } from '@/components/finance/MultiProvider';
import { SectionIntro } from '@/components/finance/ProviderManagement';
import { financeHead } from '@/lib/finance/head';
export const Route = createFileRoute('/console/finance/routing')({ head: () => financeHead('Routing', 'Ordered routing rules, coverage matrix and route simulator.'), loader: ({ context }) => context.queryClient.ensureQueryData(routingConfigOptions()), component: () => <div className="mt-6" data-no-localize><SectionIntro en="Ordered routing rules, the coverage matrix and the route simulator in one place. One deal uses one provider from pay-in to payout." ar="قواعد التوجيه المرتبة ومصفوفة التغطية ومحاكي المسار في مكان واحد. الصفقة تستخدم مزوّداً واحداً من التحصيل إلى الصرف." /><MultiProviderPanel /></div> });
