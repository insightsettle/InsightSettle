import { createFileRoute, redirect } from '@tanstack/react-router';
/** Old URL kept working: moved to /console/finance/reports. */
export const Route = createFileRoute('/console/finance/monitoring')({ beforeLoad: () => { throw redirect({ to: '/console/finance/reports', replace: true }); } });
