// app/user/[username]/_layout.tsx
// ✅ FIXED: headerShown false for all user sub-routes
// Prevents [username] default header showing on profile, followers, following screens

import { Stack } from "expo-router";

export default function UserLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="followers" options={{ headerShown: false }} />
      <Stack.Screen name="following" options={{ headerShown: false }} />
    </Stack>
  );
}
