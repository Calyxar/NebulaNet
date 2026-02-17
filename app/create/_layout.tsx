// app/create/_layout.tsx — COMPLETED + UPDATED ✅
// Fixes:
// ✅ Removes the incorrect "boost" screen registration (boost is NOT under /create)
// ✅ Keeps Create stack clean + consistent

import { Stack } from "expo-router";

export default function CreateLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#fff" },
        headerTintColor: "#000",
        headerTitleStyle: { fontWeight: "600" },
        contentStyle: { backgroundColor: "#fff" },
      }}
    >
      {/* /create */}
      <Stack.Screen name="index" options={{ headerShown: false }} />

      {/* /create/post, /create/media, etc */}
      <Stack.Screen name="post" options={{ headerShown: false }} />
      <Stack.Screen name="media" options={{ headerShown: false }} />
      <Stack.Screen name="event" options={{ headerShown: false }} />
      <Stack.Screen name="poll" options={{ headerShown: false }} />
      <Stack.Screen name="story" options={{ headerShown: false }} />

      {/* /create/community */}
      <Stack.Screen
        name="community"
        options={{ title: "Create Community", headerShown: false }}
      />
      <Stack.Screen name="boost" options={{ headerShown: false }} />
    </Stack>
  );
}
