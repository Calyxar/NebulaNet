import { Stack } from 'expo-router';

export default function CommunityLayout() {
  return (
    <Stack screenOptions={{ 
      headerShown: false,
      presentation: 'card',
    }}>
      <Stack.Screen name="[slug]" />
    </Stack>
  );
}