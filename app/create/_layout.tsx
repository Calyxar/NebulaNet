// app/create/_layout.tsx
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
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="post" options={{ headerShown: false }} />
      <Stack.Screen name="media" options={{ headerShown: false }} />
      <Stack.Screen name="event" options={{ headerShown: false }} />
      <Stack.Screen name="poll" options={{ headerShown: false }} />
      <Stack.Screen name="story" options={{ headerShown: false }} />
      <Stack.Screen
        name="community"
        options={{ title: "Create Community", headerShown: false }}
      />
    </Stack>
  );
}
