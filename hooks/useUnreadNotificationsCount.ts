import { useAuth } from "@/hooks/useAuth";
import {
    getUnreadNotificationsCount,
    subscribeToNotifications,
} from "@/lib/supabase";
import { useEffect, useState } from "react";

export function useUnreadNotificationsCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cleanup: undefined | (() => void);

    async function boot() {
      if (!user?.id) return;
      const initial = await getUnreadNotificationsCount();
      setCount(initial);

      cleanup = subscribeToNotifications(user.id, async () => {
        const next = await getUnreadNotificationsCount();
        setCount(next);
      });
    }

    boot();

    return () => {
      cleanup?.();
    };
  }, [user?.id]);

  return count;
}
