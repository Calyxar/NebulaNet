// app/(auth)/callback.tsx — FIREBASE ✅
// ✅ Supabase removed
// ✅ Redirects based on Firebase auth state (user)
// ✅ Works with expo-auth-session return

import { useAuth } from "@/providers/AuthProvider";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function AuthCallbackScreen() {
  const { user, isLoading } = useAuth();

  // wait for provider hydration
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // If Google sign-in succeeded, user will exist now
  if (user) return <Redirect href="/(tabs)/home" />;

  // Otherwise, send back to login
  return <Redirect href="/(auth)/login" />;
}
