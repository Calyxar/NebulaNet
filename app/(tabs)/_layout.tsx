// app/(tabs)/_layout.tsx
import { colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function TabsLayout() {
  const { user, isLoading, profile } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#e5e5e5",
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 0,
          paddingTop: 0,
        },
        tabBarActiveTintColor: colors.primary, // Use your primary color
        tabBarInactiveTintColor: "#666",
        tabBarLabelStyle: {
          fontSize: 16,
          fontWeight: "500",
          marginTop: -5, // Adjust text position
          marginBottom: 8,
        },
        // Hide icons for text-only design
        tabBarIcon: () => null,
      }}
    >
      {/* Home Tab */}
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
        }}
      />

      {/* Explore Tab */}
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
        }}
      />

      {/* Chat Tab */}
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarBadge: profile?.notification_settings?.direct_messages
            ? "•"
            : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.primary,
            fontSize: 10,
            minWidth: 8,
            height: 8,
            borderRadius: 4,
            top: 12,
          },
        }}
      />

      {/* Profile Tab */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
        }}
      />
    </Tabs>
  );
}
