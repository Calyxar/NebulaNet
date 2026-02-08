// app/_layout.tsx — FINAL (public /privacy, stable auth gating, no TS errors)
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import * as Linking from "expo-linking";
import { Stack, usePathname, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useMemo, useState } from "react";
import { Platform, StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-url-polyfill/auto";

// Prevent splash screen from auto-hiding
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
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {Platform.OS === "ios" && <StatusBar barStyle="dark-content" />}
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>
              <RootLayoutNav />
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

function RootLayoutNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { session, isLoading } = useAuth();

  // ✅ Explicit public paths (Play Console needs /privacy public)
  const isPublicPath = useMemo(() => {
    const p = (pathname || "/").split("?")[0].split("#")[0];
    return (
      p === "/" ||
      p === "/privacy" ||
      p.startsWith("/privacy/") ||
      p.startsWith("/(auth)") ||
      p.startsWith("/verify-email-handler") ||
      p.startsWith("/+not-found")
    );
  }, [pathname]);

  // ✅ Auth gating (stable, no early redirect)
  useEffect(() => {
    if (isLoading) return;
    if (!pathname) return;

    if (!session) {
      if (!isPublicPath) {
        router.replace("/(auth)/login");
      }
      return;
    }

    if (pathname.startsWith("/(auth)")) {
      router.replace("/(tabs)/home");
    }
  }, [isLoading, session, isPublicPath, pathname, router]);

  // ✅ Deep linking (privacy never redirects)
  useEffect(() => {
    const handleDeepLink = ({ url }: { url: string }) => {
      try {
        const { path } = Linking.parse(url);
        if (!path) return;

        const clean = path.startsWith("/") ? path.slice(1) : path;

        if (clean === "privacy" || clean === "privacy/") {
          router.replace("/privacy" as any);
          return;
        }

        if (clean === "invite" || clean === "invite/") {
          router.replace("/(auth)/signup");
          return;
        }

        if (!session) {
          router.replace("/(auth)/login");
          return;
        }

        if (clean.startsWith("post/")) {
          router.replace(`/post/${clean.replace("post/", "")}`);
        } else if (clean.startsWith("user/")) {
          router.replace(`/user/${clean.replace("user/", "")}`);
        } else if (clean.startsWith("community/")) {
          router.replace(`/community/${clean.replace("community/", "")}`);
        }
      } catch (err) {
        console.error("Deep link error:", err);
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    const sub = Linking.addEventListener("url", handleDeepLink);
    return () => sub.remove();
  }, [router, session]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        ...(Platform.OS === "web" && {
          animation: "fade",
          gestureEnabled: false,
        }),
      }}
    >
      {/* Public */}
      <Stack.Screen name="index" />
      <Stack.Screen name="privacy" options={{ title: "Privacy Policy" }} />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="verify-email-handler/index" />

      {/* Protected */}
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="post" />
      <Stack.Screen name="user" />
      <Stack.Screen name="profile/index" />
      <Stack.Screen name="profile/edit" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="community" />
      <Stack.Screen name="create" />

      {/* 404 */}
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
