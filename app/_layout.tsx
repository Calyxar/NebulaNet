// app/_layout.tsx — FIXED ✅
// ✅ FIXED: QueryClientProvider wraps AuthProvider (AuthProvider calls useQueryClient internally)
// ✅ FIXED: AuthProvider wraps RootLayout so useAuth() works
// ✅ Stack always renders first — no crash on startup

import { useAuth } from "@/hooks/useAuth";
import { AuthProvider } from "@/providers/AuthProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";

const queryClient = new QueryClient();

function RootLayout() {
  const { user, isLoading, isUserSettingsLoading, hasCompletedOnboarding } =
    useAuth();

  const hasNavigated = useRef(false);
  const isReady = !isLoading && !isUserSettingsLoading;

  useEffect(() => {
    if (!isReady || hasNavigated.current) return;

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

  useEffect(() => {
    hasNavigated.current = false;
  }, [user?.uid]);

  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />

        <Stack.Screen name="user/[username]" options={{ headerShown: false }} />
        <Stack.Screen
          name="user/[username]/followers"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="user/[username]/following"
          options={{ headerShown: false }}
        />

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
        <Stack.Screen
          name="profile/edit"
          options={{ headerShown: false, presentation: "modal" }}
        />
        <Stack.Screen
          name="profile/followers"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="profile/following"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="create/post"
          options={{ headerShown: false, presentation: "modal" }}
        />
        <Stack.Screen name="create/story" options={{ headerShown: false }} />
        <Stack.Screen name="create/poll" options={{ headerShown: false }} />
        <Stack.Screen name="create/event" options={{ headerShown: false }} />
        <Stack.Screen
          name="create/community"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="create/media" options={{ headerShown: false }} />
        <Stack.Screen name="create/video" options={{ headerShown: false }} />
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
      <AuthProvider>
        <RootLayout />
      </AuthProvider>
    </QueryClientProvider>
  );
}
