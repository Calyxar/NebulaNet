import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";

export function useUnreadMessagesCount() {
  const { user } = useAuth();
  const userId = user?.uid;
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) {
      setCount(0);
      return;
    }

    const q = query(
      collection(db, "conversation_participants"),
      where("user_id", "==", userId),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let total = 0;
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          total += data.unread_count || 0;
        });
        setCount(total);
      },
      (error) => {
        console.error("Error listening to unread messages:", error);
        setCount(0);
      },
    );

    return () => unsubscribe();
  }, [userId]);

  return count;
}
