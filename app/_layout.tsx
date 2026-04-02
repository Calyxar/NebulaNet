// app/_layout.tsx — UPDATED ✅
// ✅ FIXED: user/[username] screen added with headerShown: false (removes duplicate header)
// ✅ FIXED: user/[username]/followers and following routes added
// ✅ FIXED: post, community, story, chat, hashtag, boost screens all headerShown: false

import { useAuth } from "@/hooks/useAuth";
import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function RootLayout() {
  const { isLoading } = useAuth();

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

      {/* ✅ FIXED: user profile — was showing "[username]" default header + custom header */}
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
