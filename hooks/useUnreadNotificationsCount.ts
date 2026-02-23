// hooks/useUnreadNotificationsCount.ts — FIREBASE ✅

import { useAuth } from "@/hooks/useAuth";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";

async function getUnreadNotificationsCount(): Promise<number> {
  const user = auth.currentUser;
  if (!user) return 0;

  const snap = await getDocs(
    query(
      collection(db, "notifications"),
      where("receiver_id", "==", user.uid),
      where("read", "==", false),
    ),
  );
  return snap.size;
}

export function useUnreadNotificationsCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user?.id) {
      setCount(0);
      return;
    }

    let alive = true;

    const refresh = async () => {
      try {
        const next = await getUnreadNotificationsCount();
        if (alive) setCount(next);
      } catch {}
    };

    // Initial fetch
    refresh();

    // Real-time subscription (replaces subscribeToNotifications)
    const q = query(
      collection(db, "notifications"),
      where("receiver_id", "==", user.uid),
      where("read", "==", false),
    );

    const unsub = onSnapshot(q, (snap) => {
      if (alive) setCount(snap.size);
    });

    return () => {
      alive = false;
      unsub();
    };
  }, [user?.id]);

  return count;
}
