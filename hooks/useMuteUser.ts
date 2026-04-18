// hooks/useMuteUser.ts — NEW ✅
// Stores muted users in user_settings.muted_users array
// Muted users' posts are filtered from feed

import { auth, db } from "@/lib/firebase";
import firestore from "@react-native-firebase/firestore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useMuteStatus(targetUserId: string) {
  const uid = auth.currentUser?.uid;
  return useQuery({
    queryKey: ["mute-status", uid, targetUserId],
    enabled: !!uid && !!targetUserId,
    queryFn: async () => {
      if (!uid) return false;
      const snap = await db.collection("user_settings").doc(uid).get();
      if (!snap.exists) return false;
      const muted: string[] = snap.data()?.muted_users ?? [];
      return muted.includes(targetUserId);
    },
  });
}

export function useToggleMute(targetUserId: string) {
  const qc = useQueryClient();
  const uid = auth.currentUser?.uid;

  return useMutation({
    mutationFn: async (isMuted: boolean) => {
      if (!uid) throw new Error("Not authenticated");
      const ref = db.collection("user_settings").doc(uid);
      await ref.update({
        muted_users: isMuted
          ? firestore.FieldValue.arrayRemove(targetUserId)
          : firestore.FieldValue.arrayUnion(targetUserId),
      });
      return !isMuted;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mute-status", uid, targetUserId] });
    },
  });
}
