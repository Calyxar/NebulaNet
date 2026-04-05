// app/_layout.tsx — Clean & Fixed ✅

import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { Stack, router } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";

function RootLayoutContent() {
  const { user, isLoading, isUserSettingsLoading, hasCompletedOnboarding } =
    useAuth();

  const hasNavigated = useRef(false);
  const isReady = !isLoading && !isUserSettingsLoading;

  // Handle navigation based on auth / onboarding
  useEffect(() => {
    if (!isReady) return;
    if (hasNavigated.current) return;

    if (!user) {
      hasNavigated.current = true;
      router.replace("/(auth)/login");
      return;
    }

    if (!hasCompletedOnboarding) {
      hasNavigated.current = true;
      router.replace("/(auth)/onboarding");
      return;
    }
  }, [isReady, user, hasCompletedOnboarding]);

  // Reset navigation flag when user changes (e.g., sign out/sign in)
  useEffect(() => {
    hasNavigated.current = false;
  }, [user?.uid]);

  return (
    <>
      {/* Stack always renders first to avoid layout crash */}
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="user/[username]" options={{ headerShown: false }} />
        <Stack.Screen name="post/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="story/[id]" options={{ headerShown: false }} />
        <Stack.Screen
          name="community/[slug]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="create/post"
          options={{ headerShown: false, presentation: "modal" }}
        />
        {/* Add other screens here as needed */}
      </Stack>

      {/* Loading overlay — sits on top of Stack */}
      {(isLoading || isUserSettingsLoading) && (
        <View
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "#08050f",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator size="large" color="#7c3aed" />
        </View>
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <RootLayoutContent />
      </ThemeProvider>
    </AuthProvider>
  );
}
