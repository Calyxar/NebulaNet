// app/_layout.tsx — FIXED (providers split + public /privacy + no typed-route TS errors)
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
  // Create QueryClient instance
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 2,
            staleTime: 1000 * 60 * 5, // 5 minutes
            refetchOnWindowFocus: Platform.OS === "web",
          },
        },
      }),
  );

  // Load fonts
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

  // ✅ Public routes should never require auth (Play Console needs /privacy public)
  const isPublicPath = useMemo(() => {
    if (!pathname) return true;
    return (
      pathname === "/" ||
      pathname.startsWith("/privacy") ||
      pathname.startsWith("/(auth)") ||
      pathname.startsWith("/verify-email-handler") ||
      pathname.startsWith("/+not-found")
    );
  }, [pathname]);

  // ✅ Auth gating (web + native)
  useEffect(() => {
    if (isLoading) return;

    // Not signed in: allow public paths only
    if (!session) {
      if (!isPublicPath) {
        router.replace("/(auth)/login");
      }
      return;
    }

    // Signed in: keep auth screens out of the way
    if (pathname?.startsWith("/(auth)")) {
      router.replace("/(tabs)/home");
    }
  }, [isLoading, session, isPublicPath, pathname, router]);

  // ✅ Deep linking handler (safe, respects public routes)
  useEffect(() => {
    const handleDeepLink = ({ url }: { url: string }) => {
      try {
        const { path } = Linking.parse(url);
        if (!path) return;

        const cleanPath = path.startsWith("/") ? path.slice(1) : path;

        // Public deep links
        if (cleanPath === "privacy" || cleanPath === "privacy/") {
          router.replace("/privacy" as any);
          return;
        }
        if (cleanPath === "invite" || cleanPath === "invite/") {
          router.replace("/(auth)/signup");
          return;
        }

        // Protected deep links: if no session, go login
        if (!session) {
          router.replace("/(auth)/login");
          return;
        }

        if (cleanPath.startsWith("post/")) {
          const postId = cleanPath.replace("post/", "");
          router.replace(`/post/${postId}`);
        } else if (cleanPath.startsWith("user/")) {
          const username = cleanPath.replace("user/", "");
          router.replace(`/user/${username}`);
        } else if (cleanPath.startsWith("community/")) {
          const slug = cleanPath.replace("community/", "");
          router.replace(`/community/${slug}`);
        }
      } catch (error) {
        console.error("❌ Error handling deep link:", error);
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
      {/* Public routes */}
      <Stack.Screen
        name="index"
        options={{ animation: Platform.OS === "web" ? "fade" : "default" }}
      />
      <Stack.Screen
        name="privacy"
        options={{
          title: "Privacy Policy",
          animation: Platform.OS === "web" ? "fade" : "default",
        }}
      />
      <Stack.Screen
        name="(auth)"
        options={{ animation: Platform.OS === "web" ? "fade" : "default" }}
      />
      <Stack.Screen
        name="verify-email-handler/index"
        options={{
          title: "Email Verification",
          animation: Platform.OS === "web" ? "fade" : "default",
        }}
      />

      {/* Protected routes */}
      <Stack.Screen
        name="(tabs)"
        options={{ animation: Platform.OS === "web" ? "fade" : "default" }}
      />
      <Stack.Screen
        name="post"
        options={{
          title: "Post",
          animation: Platform.OS === "web" ? "fade" : "default",
        }}
      />
      <Stack.Screen
        name="user"
        options={{
          title: "User Profile",
          animation: Platform.OS === "web" ? "fade" : "default",
        }}
      />
      <Stack.Screen
        name="profile/index"
        options={{
          title: "My Profile",
          animation: Platform.OS === "web" ? "fade" : "default",
        }}
      />
      <Stack.Screen
        name="profile/edit"
        options={{
          title: "Edit Profile",
          animation: Platform.OS === "web" ? "fade" : "default",
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: "Settings",
          animation: Platform.OS === "web" ? "fade" : "default",
        }}
      />
      <Stack.Screen
        name="community"
        options={{
          title: "Community",
          animation: Platform.OS === "web" ? "fade" : "default",
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: "Create Post",
          animation: Platform.OS === "web" ? "fade" : "default",
        }}
      />

      {/* 404 Not Found - Must be last */}
      <Stack.Screen
        name="+not-found"
        options={{
          title: "Not Found",
          animation: Platform.OS === "web" ? "fade" : "default",
        }}
      />
    </Stack>
  );
}
