import { createFileRoute } from '@tanstack/react-router';
import { FinancePage, financeOptions } from '@/components/finance/FinanceCenter';
import { SectionIntro } from '@/components/finance/ProviderManagement';
import { financeHead } from '@/lib/finance/head';
export const Route = createFileRoute('/console/finance/reports')({ head: () => financeHead('Reports and monitoring', 'CSV exports and provider health in the sandbox.'), loader: ({ context }) => context.queryClient.ensureQueryData(financeOptions()), component: () => <div className="mt-6" data-no-localize><SectionIntro en="CSV exports and provider health. Health shows only what Insight can observe; no external metrics are invented." ar="تصدير CSV وحالة المزوّدين. تُعرض فقط البيانات التي تراها إنسايت؛ لا مقاييس خارجية مختلقة." /><FinancePage section="monitoring" /></div> });
