// app/settings/_layout.tsx
import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // ✅ IMPORTANT: prevents duplicate headers
        animation: Platform.OS === "ios" ? "default" : "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="account-center" />
      <Stack.Screen name="feed-preferences" />
      <Stack.Screen name="saved-content" />
      <Stack.Screen name="language" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="privacy-choice" />
      <Stack.Screen name="blocked" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="security" />
      <Stack.Screen name="linked-accounts" />
      <Stack.Screen name="report" />
      <Stack.Screen name="about" />
      <Stack.Screen name="change-password" />
      <Stack.Screen name="deactivate" options={{ presentation: "modal" }} />
      <Stack.Screen name="delete-account" options={{ presentation: "modal" }} />
    </Stack>
  );
}
