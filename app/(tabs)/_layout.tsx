// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import {
  Home,
  MessageCircle,
  PlusSquare,
  Search,
  User,
} from "lucide-react-native";
import React from "react";
import { Platform } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: "#7C3AED",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
        },
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E6EAF5",
          borderTopWidth: 1,
          height: Platform.OS === "android" ? 62 : 86,
          paddingTop: 8,
          paddingBottom: Platform.OS === "android" ? 10 : 26,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Home color={color} size={size ?? 24} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color, size }) => (
            <Search color={color} size={size ?? 24} />
          ),
        }}
      />

      {/* Normal Tab for Post */}
      <Tabs.Screen
        name="create"
        options={{
          title: "Post",
          tabBarIcon: ({ color, size }) => (
            <PlusSquare color={color} size={size ?? 24} />
          ),
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, size }) => (
            <MessageCircle color={color} size={size ?? 24} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <User color={color} size={size ?? 24} />
          ),
        }}
      />

      {/* hidden route */}
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}
