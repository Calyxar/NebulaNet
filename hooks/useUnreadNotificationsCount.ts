import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";
import { useEffect, useState } from "react";

export function useUnreadNotificationsCount() {
  const { user } = useAuth();
  const userId = user?.uid;
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) {
      setCount(0);
      return;
    }

    const unsubscribe = db
      .collection("notifications")
      .where("receiver_id", "==", userId)
      .where("is_read", "==", false)
      .onSnapshot(
        (snapshot) => {
          setCount(snapshot.size);
        },
        (error) => {
          console.error("Error listening to unread notifications:", error);
          setCount(0);
        },
      );

    return () => unsubscribe();
  }, [userId]);

  return count;
}
