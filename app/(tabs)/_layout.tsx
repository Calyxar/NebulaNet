// app/(tabs)/_layout.tsx — ✅ UPDATED (notifications badge)
import CurvedTabBar from "@/components/navigation/CurvedTabBar";
import { auth } from "@/lib/firebase";
import { subscribeToMyNotifications } from "@/lib/firestore/notifications";
import { Tabs } from "expo-router";
import React, { useEffect, useState } from "react";

export default function TabsLayout() {
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);

  useEffect(() => {
    let unsubNotifs: (() => void) | null = null;
    let authUnsub: (() => void) | null = null;

    authUnsub = auth.onAuthStateChanged((user) => {
      // reset on logout
      setUnreadNotifCount(0);

      // cleanup previous subscription
      if (unsubNotifs) {
        unsubNotifs();
        unsubNotifs = null;
      }

      if (!user) return;

      // realtime notifications → unread badge count
      unsubNotifs = subscribeToMyNotifications({
        limit: 50,
        onChange: (rows) => {
          const unread = rows.reduce((acc, n) => acc + (!n.is_read ? 1 : 0), 0);
          setUnreadNotifCount(unread);
        },
      });
    });

    return () => {
      if (unsubNotifs) unsubNotifs();
      if (authUnsub) authUnsub();
    };
  }, []);

  const profileBadge =
    unreadNotifCount > 0
      ? unreadNotifCount > 99
        ? "99+"
        : unreadNotifCount
      : undefined;

  return (
    <Tabs
      tabBar={(props) => <CurvedTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="create" />
      <Tabs.Screen name="home" />
      <Tabs.Screen
        name="profile"
        options={{
          // 👇 CurvedTabBar must render this value
          tabBarBadge: profileBadge,
        }}
      />
    </Tabs>
  );
}
