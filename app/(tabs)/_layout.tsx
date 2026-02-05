// app/(tabs)/_layout.tsx
import { CurvedTabBar } from "@/components/navigation/CurvedTabBar";
import { Tabs } from "expo-router";
import React from "react";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CurvedTabBar {...props} />}
      screenOptions={{
        headerShown: false,

        // IMPORTANT: let CurvedTabBar control height/shape.
        // Keep the native tab bar "invisible" so it doesn't interfere.
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0, // Android shadow off
        },
        tabBarBackground: () => null,
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="create" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="profile" />

      {/* hidden route */}
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}
