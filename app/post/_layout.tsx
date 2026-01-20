import { Stack } from 'expo-router';

export default function PostLayout() {
  return (
    <Stack screenOptions={{ 
      headerShown: false,
      presentation: 'modal',
    }}>
      <Stack.Screen name="create" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}