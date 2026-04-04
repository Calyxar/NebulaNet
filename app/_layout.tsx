// app/_layout.tsx — UPDATED ✅
// ✅ FIXED: sign out now redirects to login (was getting stuck)
// ✅ FIXED: onboarding shows when hasCompletedOnboarding is false
// ✅ FIXED: auth state changes properly drive navigation
// ✅ FIXED: crash prevention — null guards on user/profile loading

import { useAuth } from "@/hooks/useAuth";
import { Stack, router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

export default function RootLayout() {
  const {
    user,
    isLoading,
    isProfileLoading,
    isUserSettingsLoading,
    hasCompletedOnboarding,
  } = useAuth();

  const settingsReady = !isUserSettingsLoading;
  const fullyLoaded = !isLoading && !isProfileLoading && settingsReady;

  useEffect(() => {
    if (!fullyLoaded) return;

    if (!user) {
      // ✅ FIXED: sign out → redirect to login immediately
      router.replace("/(auth)/login");
      return;
    }

    // ✅ FIXED: show onboarding if not completed
    if (!hasCompletedOnboarding) {
      router.replace("/(auth)/onboarding");
      return;
    }

    // User is logged in and onboarded — stay on current screen
  }, [user, fullyLoaded, hasCompletedOnboarding]);

  // Show spinner while auth hydrates
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
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
      <Stack.Screen name="community/[slug]" options={{ headerShown: false }} />
      <Stack.Screen name="community/create" options={{ headerShown: false }} />
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
      <Stack.Screen name="profile/followers" options={{ headerShown: false }} />
      <Stack.Screen name="profile/following" options={{ headerShown: false }} />

      <Stack.Screen
        name="create/post"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen name="create/story" options={{ headerShown: false }} />
      <Stack.Screen name="create/poll" options={{ headerShown: false }} />
      <Stack.Screen name="create/event" options={{ headerShown: false }} />
      <Stack.Screen name="create/community" options={{ headerShown: false }} />
      <Stack.Screen name="create/media" options={{ headerShown: false }} />
      <Stack.Screen name="create/video" options={{ headerShown: false }} />
      <Stack.Screen name="u/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
