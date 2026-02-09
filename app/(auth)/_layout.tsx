// app/(auth)/_layout.tsx — COMPLETE UPDATED
// ✅ Blocks until AuthProvider finishes first getSession()
// ✅ If logged in, redirects away from auth screens

import { useAuth } from "@/providers/AuthProvider";
import { Redirect, Stack } from "expo-router";

export default function AuthLayout() {
  const { session, isLoading } = useAuth();

  // Wait for initial session hydration (prevents auth screen flash)
  if (isLoading) return null;

  // If logged in, never stay on auth screens
  if (session?.user) {
    return <Redirect href="/(tabs)/home" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="create-password" />
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="callback" />
    </Stack>
  );
}
