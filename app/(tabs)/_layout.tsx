import CurvedTabBar from "@/components/navigation/CurvedTabBar";
import { useUnreadNotificationsCount } from "@/hooks/useUnreadNotificationsCount";
import { Tabs } from "expo-router";
import React from "react";

export default function TabsLayout() {
  const unreadCount = useUnreadNotificationsCount();

  const notificationBadge =
    unreadCount > 0 ? (unreadCount > 99 ? "99+" : unreadCount) : undefined;

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
          tabBarBadge: notificationBadge,
        }}
      />
    </Tabs>
  );
}
