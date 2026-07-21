// hooks/useUser.ts — React Native Firebase ✅

import { UserProfile } from "@/types/user";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type UpdateProfileData = Partial<
  Pick<
    UserProfile,
    "full_name" | "bio" | "website" | "location" | "avatar_url" | "showBirthday"
  >
>;

export function useUser(username?: string) {
  const queryClient = useQueryClient();

  const userQuery = useQuery({
    queryKey: ["user", username],
    enabled: !!username,
    queryFn: async () => {
      if (!username) return null;
      const snap = await firestore()
        .collection("profiles")
        .where("username", "==", username)
        .limit(1)
        .get();
      if (snap.empty) throw new Error("User not found");
      const d = snap.docs[0].data() as any;
      return { id: snap.docs[0].id, ...d } as UserProfile;
    },
  });

  const currentUserQuery = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const user = auth().currentUser;
      if (!user) return null;
      const snap = await firestore().collection("profiles").doc(user.uid).get();
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as UserProfile;
    },
  });

  const toggleFollow = useMutation({
    mutationFn: async (targetUserId: string) => {
      const user = auth().currentUser;
      if (!user) throw new Error("Not authenticated");

      const snap = await firestore()
        .collection("follows")
        .where("follower_id", "==", user.uid)
        .where("following_id", "==", targetUserId)
        .limit(1)
        .get();

      if (!snap.empty) {
        await snap.docs[0].ref.delete();
        return "unfollowed" as const;
      }

      const target = await firestore()
        .collection("profiles")
        .doc(targetUserId)
        .get();
      const isPrivate = !!(target.data() as any)?.is_private;

      await firestore()
        .collection("follows")
        .add({
          follower_id: user.uid,
          following_id: targetUserId,
          status: isPrivate ? "pending" : "accepted",
          created_at: firestore.FieldValue.serverTimestamp(),
        });
      return "followed" as const;
    },
    onSuccess: (_result, targetUserId) => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      queryClient.invalidateQueries({ queryKey: ["profile-by-username"] });
      queryClient.invalidateQueries({ queryKey: ["followers", targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["following", targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["follow-status"] });
    },
  });

  const followersQuery = useQuery({
    queryKey: ["followers", userQuery.data?.id],
    enabled: !!userQuery.data?.id,
    queryFn: async () => {
      if (!userQuery.data?.id) return [];
      const snap = await firestore()
        .collection("follows")
        .where("following_id", "==", userQuery.data.id)
        .where("status", "==", "accepted")
        .get();
      const profiles = await Promise.all(
        snap.docs.map(async (d) => {
          const followerId = (d.data() as any).follower_id;
          const pSnap = await firestore()
            .collection("profiles")
            .doc(followerId)
            .get();
          return pSnap.exists() ? { id: pSnap.id, ...pSnap.data() } : null;
        }),
      );
      return profiles.filter(Boolean) as UserProfile[];
    },
  });

  const followingQuery = useQuery({
    queryKey: ["following", userQuery.data?.id],
    enabled: !!userQuery.data?.id,
    queryFn: async () => {
      if (!userQuery.data?.id) return [];
      const snap = await firestore()
        .collection("follows")
        .where("follower_id", "==", userQuery.data.id)
        .where("status", "==", "accepted")
        .get();
      const profiles = await Promise.all(
        snap.docs.map(async (d) => {
          const followingId = (d.data() as any).following_id;
          const pSnap = await firestore()
            .collection("profiles")
            .doc(followingId)
            .get();
          return pSnap.exists() ? { id: pSnap.id, ...pSnap.data() } : null;
        }),
      );
      return profiles.filter(Boolean) as UserProfile[];
    },
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: UpdateProfileData) => {
      const user = auth().currentUser;
      if (!user) throw new Error("Not authenticated");
      await firestore()
        .collection("profiles")
        .doc(user.uid)
        .set(
          {
            ...updates,
            updated_at: firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      const snap = await firestore().collection("profiles").doc(user.uid).get();
      return { id: snap.id, ...snap.data() } as UserProfile;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["currentUser"], data);
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });

  return {
    user: userQuery.data,
    currentUser: currentUserQuery.data,
    isLoading: userQuery.isLoading || currentUserQuery.isLoading,
    isFetching: userQuery.isFetching,
    followers: followersQuery.data,
    following: followingQuery.data,
    toggleFollow,
    updateProfile,
    refetch: () => {
      userQuery.refetch();
      currentUserQuery.refetch();
    },
  };
}
