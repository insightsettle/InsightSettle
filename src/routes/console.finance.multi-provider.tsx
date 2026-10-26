import { createFileRoute, redirect } from '@tanstack/react-router';
/** Old URL kept working: moved to /console/finance/routing. */
export const Route = createFileRoute('/console/finance/multi-provider')({ beforeLoad: () => { throw redirect({ to: '/console/finance/routing', replace: true }); } });
