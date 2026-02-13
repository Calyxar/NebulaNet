// app/index.tsx — UPDATED (wait for user_settings before onboarding routing)

import { useAuth } from "@/providers/AuthProvider";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const { session, isLoading, isUserSettingsLoading, hasCompletedOnboarding } =
    useAuth();

  // Wait for session hydration
  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  // Not signed in -> auth flow
  if (!session?.user) return <Redirect href="/(auth)/login" />;

  // Signed in -> WAIT for settings before deciding onboarding
  if (isUserSettingsLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!hasCompletedOnboarding) return <Redirect href="/(auth)/onboarding" />;

  return <Redirect href="/(tabs)/home" />;
}
