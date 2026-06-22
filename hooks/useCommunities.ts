// hooks/useCommunities.ts ✅ FIXED — user.uid not user.id
// ✅ FIX: fetchMyCommunities now receives uid explicitly from useAuth()'s
// user state, instead of independently reading auth.currentUser inside
// the query function. Single source of truth for "who is signed in" —
// no more race between two different auth reads.

import { useAuth } from "@/hooks/useAuth";
import { fetchMyCommunities, type Community } from "@/lib/queries/communities";
import { useQuery } from "@tanstack/react-query";

export function useCommunities() {
  const { user } = useAuth();
  const uid = user?.uid;

  const { data = [], isLoading } = useQuery({
    queryKey: ["my-communities", uid],
    queryFn: () => fetchMyCommunities(uid!),
    enabled: !!uid,
  });

  const myCommunityIds = data.map((c) => c.id);

  return {
    myCommunities: data as Community[],
    myCommunityIds,
    isLoading,
  };
}
