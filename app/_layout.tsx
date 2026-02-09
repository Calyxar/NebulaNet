// app/_layout.tsx — providers only (NO auth gating here) + ✅ 30-day inactivity watcher
import { startInactivityWatcher } from "@/lib/inactivity";
import { AuthProvider } from "@/providers/AuthProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { Platform, StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-url-polyfill/auto";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 2,
            staleTime: 1000 * 60 * 5,
            refetchOnWindowFocus: Platform.OS === "web",
          },
        },
      }),
  );

  const [fontsLoaded, fontError] = useFonts({
    "Inter-Regular": require("../assets/fonts/Inter-Regular.ttf"),
    "Inter-Medium": require("../assets/fonts/Inter-Medium.ttf"),
    "Inter-SemiBold": require("../assets/fonts/Inter-SemiBold.ttf"),
    "Inter-Bold": require("../assets/fonts/Inter-Bold.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  // ✅ 30-day inactivity watcher (logs user out only after being away >= 30 days)
  useEffect(() => {
    const stop = startInactivityWatcher();
    return stop;
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {Platform.OS === "ios" && <StatusBar barStyle="dark-content" />}
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>
              <Stack screenOptions={{ headerShown: false }}>
                {/* Public */}
                <Stack.Screen name="index" />
                <Stack.Screen name="privacy" />
                <Stack.Screen name="delete-account" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="verify-email-handler/index" />

                {/* Protected */}
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="post" />
                <Stack.Screen name="user" />
                <Stack.Screen name="community" />
                <Stack.Screen name="create" />
                <Stack.Screen name="settings" />
                <Stack.Screen name="profile" />
                <Stack.Screen name="u/[id]" />

                {/* 404 */}
                <Stack.Screen name="+not-found" />
              </Stack>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
