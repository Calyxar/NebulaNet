// app/_layout.tsx
import { parseNebulaNetLink } from "@/lib/share";
import { AuthProvider } from "@/providers/AuthProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Configure notification handler - only for local notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Setup Android notification channel - only for local notifications
async function setupNotificationChannels() {
  if (Platform.OS === "android") {
    try {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#E6F4FE",
        sound: "mixkit_sci_fi_click_900.wav",
        enableVibrate: true,
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    } catch (error) {
      console.error("Error setting up notification channel:", error);
    }
  }
}

// Add notification handling hook - only for local notifications
function useNotificationHandler() {
  const router = useRouter();

  useEffect(() => {
    // Setup notification channels for local notifications
    setupNotificationChannels();

    // Listen for notification responses (user tapped on notification)
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        console.log("Notification response:", data);

        // Handle deep linking from notifications
        if (data?.type === "post" && data?.postId) {
          router.push(`/post/${data.postId}`);
        } else if (data?.type === "user" && data?.userId) {
          router.push(`/user/${data.userId}`);
        } else if (data?.type === "community" && data?.communityId) {
          router.push(`/community/${data.communityId}`);
        } else if (data?.url) {
          // Handle custom URLs
          Linking.openURL(data.url as string);
        }
      });

    return () => {
      // Clean up subscription
      if (
        typeof responseSubscription === "object" &&
        "remove" in responseSubscription
      ) {
        (responseSubscription as any).remove();
      }
    };
  }, [router]);
}

// Add deep linking hook
function useDeepLinking() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const { type, id } = parseNebulaNetLink(event.url);

      switch (type) {
        case "post":
          router.push(`/post/${id}`);
          break;
        case "user":
          router.push(`/user/${id}`);
          break;
        case "community":
          router.push(`/community/${id}`);
          break;
        default:
          console.log("Unknown deep link:", event.url);
      }
    };

    // Get initial URL if app was opened with a link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    // Listen for incoming links when app is already open
    const subscription = Linking.addEventListener(
      "url",
      (event: { url: string }) => {
        handleDeepLink(event);
      },
    );

    return () => {
      subscription.remove();
    };
  }, [router, segments]);
}

// Auth redirect wrapper component
function AuthRedirectWrapper({ children }: { children: React.ReactNode }) {
  const { useAuth } = require("@/hooks/useAuth");
  const { isAuthenticated, isEmailVerified, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const firstSegment = segments[0] as string | undefined;
    const secondSegment = segments[1] as string | undefined;

    const inAuthGroup = firstSegment === "(auth)";
    const inVerifyEmail = secondSegment === "verify-email";
    const inOnboarding = secondSegment === "onboarding";
    const inIndex = firstSegment === "index";

    // Don't redirect if we're already on verify-email or onboarding
    if (inVerifyEmail || inOnboarding) {
      return;
    }

    if (!isAuthenticated && !inAuthGroup && !inIndex) {
      // Redirect to login if not authenticated and not on index
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      // If authenticated but in auth group, check email verification
      if (!isEmailVerified && secondSegment !== "verify-email") {
        // Redirect to email verification if not verified
        router.replace("/(auth)/verify-email");
      } else if (secondSegment !== "onboarding") {
        // If email verified and not on onboarding, redirect to home
        router.replace("/(tabs)/home");
      }
    } else if (isAuthenticated && inIndex) {
      // If authenticated and on index, redirect to home
      router.replace("/(tabs)/home");
    }
  }, [isAuthenticated, isEmailVerified, isLoading, segments, router]);

  return <>{children}</>;
}

function RootLayoutContent() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 60, // 1 hour (formerly cacheTime)
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  // Use notification handling hook
  useNotificationHandler();

  // Use deep linking hook
  useDeepLinking();

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <AuthRedirectWrapper>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "slide_from_right",
              gestureEnabled: true,
              gestureDirection: "horizontal",
              contentStyle: {
                backgroundColor: "#ffffff",
              },
            }}
          >
            {/* Auth stack */}
            <Stack.Screen
              name="(auth)"
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />

            {/* Main tabs */}
            <Stack.Screen
              name="(tabs)"
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />

            {/* Landing page */}
            <Stack.Screen
              name="index"
              options={{
                headerShown: false,
                animation: "fade",
              }}
            />

            {/* Dynamic routes */}
            <Stack.Screen
              name="post/[id]"
              options={{
                headerShown: false,
                presentation: "modal",
              }}
            />

            <Stack.Screen
              name="user/[username]"
              options={{
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="community/[slug]"
              options={{
                headerShown: false,
              }}
            />

            {/* Profile routes */}
            <Stack.Screen
              name="profile/index"
              options={{
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="profile/edit"
              options={{
                headerShown: false,
                presentation: "modal",
              }}
            />

            {/* Settings */}
            <Stack.Screen
              name="settings"
              options={{
                headerShown: false,
              }}
            />

            {/* Modal routes */}
            <Stack.Screen
              name="modal"
              options={{
                presentation: "modal",
                headerShown: false,
              }}
            />

            {/* 404 - Catch-all route */}
            <Stack.Screen
              name="+not-found"
              options={{
                headerShown: false,
              }}
            />
          </Stack>
        </AuthRedirectWrapper>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootLayoutContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
