import { createFileRoute, redirect } from '@tanstack/react-router';
/** Old URL kept working: moved to /console/finance/operations. */
export const Route = createFileRoute('/console/finance/queue')({ beforeLoad: () => { throw redirect({ to: '/console/finance/operations', replace: true }); } });
