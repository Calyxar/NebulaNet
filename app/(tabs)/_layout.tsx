// app/(tabs)/_layout.tsx – FINAL, RESPONSIVE, NO OVERLAP
import { CurvedTabBar } from "@/components/navigation/CurvedTabBar";
import { useAuth } from "@/hooks/useAuth";
import { Redirect, Tabs } from "expo-router";
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

export default function TabsLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    /**
     * 🔑 IMPORTANT:
     * This wrapper provides a consistent background behind the curved tab bar.
     * Without this, the notch will look wrong on gradient screens (Explore).
     */
    <View style={styles.root}>
      <Tabs
        tabBar={(props) => <CurvedTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="home" />
        <Tabs.Screen name="explore" />
        <Tabs.Screen name="create" />
        <Tabs.Screen name="chat" />
        <Tabs.Screen name="profile" />
        {/* hidden from tab bar */}
        <Tabs.Screen name="notifications" options={{ href: null }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    /**
     * ✅ MUST MATCH CurvedTabBar notch background
     * This prevents the notch from looking “cut wrong”
     * on Samsung A54 + gradient screens.
     */
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
});
