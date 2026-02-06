// app/profile/_layout.tsx
import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: Platform.OS === "ios" ? "default" : "slide_from_right",
      }}
    >
      {/* main profile tab screen */}
      <Stack.Screen name="index" />

      {/* future routes (safe to add now) */}
      <Stack.Screen name="followers" />
      <Stack.Screen name="following" />
      <Stack.Screen name="edit" options={{ presentation: "modal" }} />
    </Stack>
  );
}
