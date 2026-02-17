// app/boost/_layout.tsx
import { Stack } from "expo-router";

export default function BoostLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[postId]" />
    </Stack>
  );
}
