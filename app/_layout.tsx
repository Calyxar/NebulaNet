// app/_layout.tsx - Root Layout
import { AuthProvider } from "@/providers/AuthProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import * as Linking from "expo-linking";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Platform, StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();

  // Create QueryClient instance
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 2,
            staleTime: 1000 * 60 * 5, // 5 minutes
            refetchOnWindowFocus: Platform.OS === "web", // Only refetch on web
          },
        },
      }),
  );

  // Load fonts - going up one directory from app/ to root
  const [fontsLoaded, fontError] = useFonts({
    "Inter-Regular": require("../assets/fonts/Inter-Regular.ttf"),
    "Inter-Medium": require("../assets/fonts/Inter-Medium.ttf"),
    "Inter-SemiBold": require("../assets/fonts/Inter-SemiBold.ttf"),
    "Inter-Bold": require("../assets/fonts/Inter-Bold.ttf"),
  });

  // Deep linking handler
  useEffect(() => {
    const handleDeepLink = ({ url }: { url: string }) => {
      console.log("🔗 Deep link received:", url);

      try {
        const { path } = Linking.parse(url);

        if (!path) return;

        // Remove leading slash if present
        const cleanPath = path.startsWith("/") ? path.slice(1) : path;

        // Route to appropriate screen based on path
        if (cleanPath.startsWith("post/")) {
          const postId = cleanPath.replace("post/", "");
          console.log("📱 Navigating to post:", postId);
          router.push(`/post/${postId}`);
        } else if (cleanPath.startsWith("user/")) {
          const username = cleanPath.replace("user/", "");
          console.log("👤 Navigating to user:", username);
          router.push(`/user/${username}`);
        } else if (cleanPath.startsWith("community/")) {
          const slug = cleanPath.replace("community/", "");
          console.log("🏘️ Navigating to community:", slug);
          router.push(`/community/${slug}`);
        } else if (cleanPath === "invite" || cleanPath === "invite/") {
          console.log("✉️ Navigating to signup");
          router.push("/(auth)/signup");
        } else {
          console.log("⚠️ Unknown path:", cleanPath);
        }
      } catch (error) {
        console.error("❌ Error handling deep link:", error);
      }
    };

    // Handle initial URL when app opens from a link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log("🚀 App opened with URL:", url);
        handleDeepLink({ url });
      }
    });

    // Listen for links while app is running
    const subscription = Linking.addEventListener("url", handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, [router]);

  // Hide splash screen when fonts are loaded
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Show nothing while loading fonts
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {Platform.OS === "ios" && <StatusBar barStyle="dark-content" />}
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: "slide_from_right",
                  // Web-specific optimizations
                  ...(Platform.OS === "web" && {
                    animation: "fade",
                    gestureEnabled: false,
                  }),
                }}
              >
                {/* Public routes */}
                <Stack.Screen
                  name="index"
                  options={{
                    animation: Platform.OS === "web" ? "fade" : "default",
                  }}
                />
                <Stack.Screen
                  name="(auth)"
                  options={{
                    animation: Platform.OS === "web" ? "fade" : "default",
                  }}
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
                  options={{
                    animation: Platform.OS === "web" ? "fade" : "default",
                  }}
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
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
