// app/(auth)/_layout.tsx — FIREBASE ✅
// ✅ Redirects away from auth screens when user is logged in
// ✅ Uses Firebase user from your provider (not Supabase session)

import { useAuth } from "@/providers/AuthProvider";
import { Redirect, Stack } from "expo-router";

export default function AuthLayout() {
  const { user, isLoading } = useAuth();

  // Wait for auth hydration
  if (isLoading) return null;

  // If logged in, kick them out of /(auth) routes
  if (user) {
    return <Redirect href="/(tabs)/home" />;
  }

  return (
    <Stack
      screenOptions={{ headerShown: false, animation: "slide_from_right" }}
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
