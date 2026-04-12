// app/_layout.tsx
import { useAuth } from "@/hooks/useAuth";
import {
  registerPushNotifications,
  setupNotificationChannels,
  setupNotificationHandler,
  setupNotificationListeners,
} from "@/lib/notifications";
import { AuthProvider } from "@/providers/AuthProvider";
import { ThemeProvider, useTheme } from "@/providers/ThemeProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";

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

    if (user?.uid) {
      registerPushNotifications();
    }

    const cleanup = setupNotificationListeners(
      (notification) => {
        console.log("Notification received:", notification);
      },
      (response) => {
        const data = response.notification.request.content.data;

        if (data?.type === "follow") {
          if (data.senderId) {
            router.push(`/user/${data.senderId}` as any);
          }
        } else if (data?.type === "message") {
          if (data.entityId) {
            router.push(`/chat/${data.entityId}` as any);
          }
        } else if (
          data?.type === "like" ||
          data?.type === "comment" ||
          data?.type === "repost"
        ) {
          if (data.entityId) {
            router.push(`/post/${data.entityId}` as any);
          }
        } else if (
          data?.type === "story_like" ||
          data?.type === "story_comment"
        ) {
          if (data.entityId) {
            router.push(`/story/${data.entityId}` as any);
          }
        } else {
          router.push("/notifications");
        }
      },
    );

    return cleanup;
  }, [user?.uid]);

  return null;
}

function RootLayout() {
  const { user, isLoading, isUserSettingsLoading, hasCompletedOnboarding } =
    useAuth();

  const isReady = !isLoading && !isUserSettingsLoading;

  useEffect(() => {
    if (!isReady) return;

    if (!user) {
      router.replace("/(auth)/login");
      return;
    }

    if (!hasCompletedOnboarding) {
      router.replace("/(auth)/onboarding");
      return;
    }
  }, [isReady, user, hasCompletedOnboarding]);

  return (
    <>
      <ThemeSync />
      <PushNotificationSetup />

      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="user" options={{ headerShown: false }} />
        <Stack.Screen name="post/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="post/create" options={{ headerShown: false }} />
        <Stack.Screen name="story/[id]" options={{ headerShown: false }} />
        <Stack.Screen
          name="community/[slug]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="community/create"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="hashtag/[tag]" options={{ headerShown: false }} />
        <Stack.Screen
          name="notifications/index"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="chat/new" options={{ headerShown: false }} />
        <Stack.Screen name="chat/search" options={{ headerShown: false }} />
        <Stack.Screen name="boost/[postId]" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="create" options={{ headerShown: false }} />
        <Stack.Screen name="u/[id]" options={{ headerShown: false }} />
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
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <RootLayout />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
