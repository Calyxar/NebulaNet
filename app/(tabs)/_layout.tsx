import CurvedTabBar from "@/components/navigation/CurvedTabBar";
import { useUnreadMessagesCount } from "@/hooks/useUnreadMessagesCount";
import { useUnreadNotificationsCount } from "@/hooks/useUnreadNotificationsCount";
import { Tabs } from "expo-router";
import React from "react";

export default function TabsLayout() {
  const unreadNotifications = useUnreadNotificationsCount();
  const unreadMessages = useUnreadMessagesCount();

  const notificationBadge =
    unreadNotifications > 0
      ? unreadNotifications > 99
        ? "99+"
        : unreadNotifications
      : undefined;

  const messageBadge =
    unreadMessages > 0
      ? unreadMessages > 99
        ? "99+"
        : unreadMessages
      : undefined;

  return (
    <Tabs
      tabBar={(props) => <CurvedTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="chat" options={{ tabBarBadge: messageBadge }} />
      <Tabs.Screen name="create" />
      <Tabs.Screen name="home" />
      <Tabs.Screen
        name="notifications"
        options={{ tabBarBadge: notificationBadge }}
      />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
