// app/create/_layout.tsx
import { Stack } from "expo-router";

export default function CreateLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#fff",
        },
        headerTintColor: "#000",
        headerTitleStyle: {
          fontWeight: "600",
        },
        contentStyle: {
          backgroundColor: "#fff",
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Create",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="post"
        options={{
          title: "Create Post",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="media"
        options={{
          title: "Share Media",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="event"
        options={{
          title: "Create Event",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="poll"
        options={{
          title: "Create Poll",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="story"
        options={{
          title: "New Story",
          headerShown: false,
        }}
      />
    </Stack>
  );
}
