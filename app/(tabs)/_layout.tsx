// app/(tabs)/_layout.tsx
// ✅ Custom CurvedTabBar + ✅ Auth gate (ONLY tabs require login)

import CurvedTabBar from "@/components/navigation/CurvedTabBar";
import { useAuth } from "@/providers/AuthProvider";
import { Redirect, Tabs } from "expo-router";
import React from "react";
import { ActivityIndicator, View } from "react-native";

export default function TabsLayout() {
  const { session, isLoading } = useAuth();

  // ✅ Block only while the FIRST getSession() is hydrating
  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  // ✅ Not logged in? Block tabs and send to login
  if (!session?.user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      tabBar={(props) => <CurvedTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="explore" options={{ title: "Explore" }} />
      <Tabs.Screen name="create" options={{ title: "Create" }} />
      <Tabs.Screen name="chat" options={{ title: "Chat" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
