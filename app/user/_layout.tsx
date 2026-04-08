import { Stack } from "expo-router";

export default function UserRootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[username]" />
    </Stack>
  );
}
