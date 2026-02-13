// hooks/useUnreadNotificationsCount.ts
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
    if (!user?.id) {
      setCount(0);
      return;
    }

    let alive = true;
    let cleanup: undefined | (() => void);

    const refresh = async () => {
      try {
        const next = await getUnreadNotificationsCount();
        if (!alive) return;
        setCount(next);
      } catch {
        // keep last known count; don't crash UI
      }
    };

    (async () => {
      await refresh();

      // Subscribe AFTER initial fetch
      cleanup = subscribeToNotifications(user.id, () => {
        // fire and forget; refresh handles its own guards
        refresh();
      });
    })();

    return () => {
      alive = false;
      cleanup?.();
    };
  }, [user?.id]);

  return count;
}
