// app/_layout.tsx ✅
// ✅ FIXED: removed hasRedirected ref — it was blocking redo onboarding redirect
//           redirect logic now runs reactively whenever auth state changes

import { useAuth } from "@/hooks/useAuth";
import "@/lib/i18n";
import {
  registerPushNotifications,
  setupNotificationChannels,
  setupNotificationHandler,
  setupNotificationListeners,
} from "@/lib/notifications";
import { AuthProvider } from "@/providers/AuthProvider";
import { ThemeProvider, useTheme } from "@/providers/ThemeProvider";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const queryClient = new QueryClient();

function ThemeSync() {
  const { user } = useAuth();
  const { loadUserPrefs } = useTheme();
  const syncedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user?.uid || syncedRef.current === user.uid) return;
    syncedRef.current = user.uid;
    void loadUserPrefs(user.uid);
  }, [user?.uid, loadUserPrefs]);
  return null;
}

function PushNotificationSetup() {
  const { user } = useAuth();
  useEffect(() => {
    setupNotificationHandler();
    setupNotificationChannels();
    if (user?.uid) registerPushNotifications();
    const cleanup = setupNotificationListeners(
      (notification) => {
        console.log("Notification received:", notification);
      },
      (response) => {
        const data = response.notification.request.content.data;
        if (data?.type === "follow") {
          if (data.senderId) router.push(`/user/${data.senderId}` as any);
        } else if (data?.type === "message") {
          if (data.entityId) router.push(`/chat/${data.entityId}` as any);
        } else if (
          data?.type === "like" ||
          data?.type === "comment" ||
          data?.type === "repost"
        ) {
          if (data.entityId) router.push(`/post/${data.entityId}` as any);
        } else if (
          data?.type === "story_like" ||
          data?.type === "story_comment"
        ) {
          if (data.entityId) router.push(`/story/${data.entityId}` as any);
        } else {
          router.push("/notifications" as any);
        }
      },
    );
    return cleanup;
  }, [user?.uid]);
  return null;
}

function RootLayout() {
  const {
    user,
    isLoading,
    isProfileLoading,
    isUserSettingsLoading,
    hasCompletedOnboarding,
    profile,
  } = useAuth();

  const isReady = !isLoading && !isUserSettingsLoading && !isProfileLoading;

  // ✅ Track the last route we navigated to so we don't re-fire the same
  // replace on every render. Using a string instead of a boolean ref means
  // any change in destination (e.g. onboarding → home after completing it)
  // will correctly re-navigate.
  const lastRoute = useRef<string | null>(null);

  useEffect(() => {
    if (!isReady) return;

    // Determine destination
    let destination: string;

    if (!user) {
      destination = "/(auth)/login";
    } else if (!hasCompletedOnboarding) {
      destination = "/(auth)/onboarding";
    } else if (!(profile as any)?.birthdate) {
      destination = "/(auth)/birthdate";
    } else {
      const ageGroup = (profile as any)?.age_group;
      const parentalApproved = (profile as any)?.parental_approved;
      if (ageGroup === "under_13" && !parentalApproved) {
        destination = "/(auth)/parental-approval";
      } else {
        destination = "/(tabs)/home";
      }
    }

    // ✅ Only navigate if destination changed — prevents infinite re-renders
    // but still re-fires when onboarding_completed flips back to false
    if (lastRoute.current === destination) return;
    lastRoute.current = destination;
    router.replace(destination as any);
  }, [isReady, user, hasCompletedOnboarding, profile]);

  // ✅ Reset lastRoute when user signs out so next login redirects correctly
  useEffect(() => {
    if (!user) lastRoute.current = null;
  }, [user]);

  return (
    <>
      <ThemeSync />
      <PushNotificationSetup />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="index" />
        <Stack.Screen name="user" />
        <Stack.Screen name="post" />
        <Stack.Screen name="story/[id]" />
        <Stack.Screen name="community" />
        <Stack.Screen name="hashtag" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="chat" />
        <Stack.Screen name="boost/[postId]" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="create" />
        <Stack.Screen name="u/[id]" />
      </Stack>
      {isLoading && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
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

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <BottomSheetModalProvider>
              <RootLayout />
            </BottomSheetModalProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
