// hooks/useUser.ts — FIREBASE ✅

import { auth, db } from "@/lib/firebase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

interface UserProfile {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  website?: string;
  location?: string;
  follower_count: number;
  following_count: number;
  post_count: number;
  created_at: string;
  is_following?: boolean;
}

interface UpdateProfileData {
  full_name?: string;
  bio?: string;
  website?: string;
  location?: string;
  avatar_url?: string;
}

export function useUser(username?: string) {
  const queryClient = useQueryClient();

  const userQuery = useQuery({
    queryKey: ["user", username],
    enabled: !!username,
    queryFn: async () => {
      if (!username) return null;
      const snap = await getDocs(
        query(collection(db, "profiles"), where("username", "==", username)),
      );
      if (snap.empty) throw new Error("User not found");
      const d = snap.docs[0].data() as any;
      return { id: snap.docs[0].id, ...d } as UserProfile;
    },
  });

  const currentUserQuery = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user) return null;
      const snap = await getDoc(doc(db, "profiles", user.uid));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as UserProfile;
    },
  });

  const toggleFollow = useMutation({
    mutationFn: async (targetUserId: string) => {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      const snap = await getDocs(
        query(
          collection(db, "follows"),
          where("follower_id", "==", user.uid),
          where("following_id", "==", targetUserId),
        ),
      );

      if (!snap.empty) {
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
        return "unfollowed";
      } else {
        await addDoc(collection(db, "follows"), {
          follower_id: user.uid,
          following_id: targetUserId,
          status: "accepted",
          created_at: serverTimestamp(),
        });
        return "followed";
      }
    },
    onSuccess: (_result, targetUserId) => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      queryClient.invalidateQueries({ queryKey: ["followers", targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["following", targetUserId] });
    },
  });

  const followersQuery = useQuery({
    queryKey: ["followers", userQuery.data?.id],
    enabled: !!userQuery.data?.id,
    queryFn: async () => {
      if (!userQuery.data?.id) return [];
      const snap = await getDocs(
        query(
          collection(db, "follows"),
          where("following_id", "==", userQuery.data.id),
        ),
      );
      const profiles = await Promise.all(
        snap.docs.map(async (d) => {
          const followerId = (d.data() as any).follower_id;
          const pSnap = await getDoc(doc(db, "profiles", followerId));
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
      const snap = await getDocs(
        query(
          collection(db, "follows"),
          where("follower_id", "==", userQuery.data.id),
        ),
      );
      const profiles = await Promise.all(
        snap.docs.map(async (d) => {
          const followingId = (d.data() as any).following_id;
          const pSnap = await getDoc(doc(db, "profiles", followingId));
          return pSnap.exists() ? { id: pSnap.id, ...pSnap.data() } : null;
        }),
      );
      return profiles.filter(Boolean) as UserProfile[];
    },
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: UpdateProfileData) => {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      await setDoc(
        doc(db, "profiles", user.uid),
        { ...updates, updated_at: new Date().toISOString() },
        { merge: true },
      );
      const snap = await getDoc(doc(db, "profiles", user.uid));
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
