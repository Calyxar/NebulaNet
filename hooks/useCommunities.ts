// hooks/useCommunities.ts ✅ FIXED — user.uid not user.id

import { useAuth } from "@/hooks/useAuth";
import { fetchMyCommunities, type Community } from "@/lib/queries/communities";
import { useQuery } from "@tanstack/react-query";

export function useCommunities() {
  const { user } = useAuth();

  const { data = [], isLoading } = useQuery({
    queryKey: ["my-communities", user?.uid], // ✅ was user?.id
    queryFn: fetchMyCommunities,
    enabled: !!user?.uid, // ✅ was user?.id
  });

  const myCommunityIds = data.map((c) => c.id);

  return {
    myCommunities: data as Community[],
    myCommunityIds,
    isLoading,
  };
}
