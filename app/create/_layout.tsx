import { Stack } from "expo-router";

export default function CreateLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="post" />
      <Stack.Screen name="media" />
      <Stack.Screen name="event" />
      <Stack.Screen name="poll" />
      <Stack.Screen name="story" />
      <Stack.Screen name="community" />
      <Stack.Screen name="boost" />
    </Stack>
  );
}
