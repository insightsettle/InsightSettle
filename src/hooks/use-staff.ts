import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { useSessionUser } from "@/hooks/use-session";
import { getStaffAccess } from "@/lib/staff.functions";

export function useStaffAccess() {
  const { user, loading } = useSessionUser();
  const checkStaff = useServerFn(getStaffAccess);
  const query = useQuery({
    queryKey: ["staff-access"],
    queryFn: () => checkStaff({}),
    enabled: Boolean(user),
    staleTime: 60_000,
  });
  return {
    isStaff: query.data?.isStaff === true,
    loading: loading || (Boolean(user) && query.isLoading),
  };
}
