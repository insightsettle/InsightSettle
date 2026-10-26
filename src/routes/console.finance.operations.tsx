import { createFileRoute } from '@tanstack/react-router';
import { FinancePage, financeOptions } from '@/components/finance/FinanceCenter';
import { ApprovalsInbox, SectionIntro, providersOptions } from '@/components/finance/ProviderManagement';
import { financeHead } from '@/lib/finance/head';
export const Route = createFileRoute('/console/finance/operations')({ head: () => financeHead('Operations and approvals', 'Refunds, disputes and the maker-checker approvals inbox.'), loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(financeOptions()), context.queryClient.ensureQueryData(providersOptions())]), component: () => <div className="mt-6 space-y-8" data-no-localize><SectionIntro en="Refunds, disputes and chargebacks queue, and every configuration change waiting for a second administrator." ar="قائمة الاسترداد والنزاعات والاعتراضات، وكل تغيير في الإعداد بانتظار مدير ثانٍ." /><ApprovalsInbox /><FinancePage section="queue" /></div> });
