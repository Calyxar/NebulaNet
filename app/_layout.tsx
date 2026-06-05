// app/_layout.tsx ✅ — no redirect loop
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
          router.push("/notifications");
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

  // ✅ Only consider ready when ALL loading states are false
  const isReady = !isLoading && !isUserSettingsLoading && !isProfileLoading;

  // ✅ Prevent redirect loop — only redirect once per session
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!isReady) return;
    // ✅ Already redirected this session — do nothing
    if (hasRedirected.current) return;

    if (!user) {
      hasRedirected.current = true;
      router.replace("/(auth)/login");
      return;
    }

    if (!hasCompletedOnboarding) {
      hasRedirected.current = true;
      router.replace("/(auth)/onboarding");
      return;
    }

    // ✅ Existing users missing birthdate (pre-feature)
    if (!(profile as any)?.birthdate) {
      hasRedirected.current = true;
      router.replace("/(auth)/birthdate" as any);
      return;
    }

    // ✅ Block under_13 without parental approval
    const ageGroup = (profile as any)?.age_group;
    const parentalApproved = (profile as any)?.parental_approved;
    if (ageGroup === "under_13" && !parentalApproved) {
      hasRedirected.current = true;
      router.replace("/(auth)/parental-approval" as any);
      return;
    }

    // ✅ All checks passed — mark done
    hasRedirected.current = true;
  }, [isReady, user, hasCompletedOnboarding, profile]);

  // ✅ Reset on logout so next login redirects correctly
  useEffect(() => {
    if (!user) {
      hasRedirected.current = false;
    }
  }, [user]);

  return (
    <>
      <ThemeSync />
      <PushNotificationSetup />

      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="user" options={{ headerShown: false }} />
        <Stack.Screen name="post" options={{ headerShown: false }} />
        <Stack.Screen name="story/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="community" options={{ headerShown: false }} />
        <Stack.Screen name="hashtag" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="chat" options={{ headerShown: false }} />
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
