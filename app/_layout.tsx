// app/_layout.tsx ✅
// ✅ FIXED: removed hasRedirected ref — it was blocking redo onboarding redirect
//           redirect logic now runs reactively whenever auth state changes
// ✅ FIXED: added react-native-get-random-values polyfill, imported FIRST
//           before anything else — uuid's v4() relies on
//           crypto.getRandomValues(), which doesn't exist in Hermes by
//           default. Without this, any uuidv4() call anywhere in the app
//           (e.g. ChatInput.tsx's chat file uploads) throws
//           "crypto.getRandomValues() not supported" and fails silently
//           into a caught error rather than crashing visibly.

import "react-native-get-random-values";

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
import messaging from "@react-native-firebase/messaging";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
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

    // ✅ onMessage set up ONCE here, not inside registerForPushNotificationsAsync
    const unsubscribeMessage = messaging().onMessage(async (remoteMessage) => {
      const title = remoteMessage.notification?.title;
      const body = remoteMessage.notification?.body;
      if (!title && !body) return;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: title ?? "NebulaNet",
          body: body ?? "",
          sound: "notification.wav",
          data: remoteMessage.data ?? {},
        },
        trigger: null,
      });
    });

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

    return () => {
      unsubscribeMessage();
      cleanup();
    };
  }, []); // ✅ runs once only

  // ✅ Register FCM token separately when user changes
  useEffect(() => {
    if (user?.uid) registerPushNotifications(user.uid);
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

  const lastRoute = useRef<string | null>(null);

  useEffect(() => {
    if (!isReady) return;

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

    if (lastRoute.current === destination) return;
    lastRoute.current = destination;
    router.replace(destination as any);
  }, [isReady, user, hasCompletedOnboarding, profile]);

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
