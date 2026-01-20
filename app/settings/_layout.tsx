// app/settings/_layout.tsx
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { Platform, TouchableOpacity } from 'react-native';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTintColor: '#000',
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerShadowVisible: false,
        headerBackTitle: 'Back',
        animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
      }}
    >
      {/* Main Settings Screen */}
      <Stack.Screen 
        name="index" 
        options={{
          title: 'Settings',
          headerLeft: () => Platform.OS === 'ios' ? (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: -8 }}>
              <Ionicons name="chevron-back" size={24} color="#007AFF" />
            </TouchableOpacity>
          ) : undefined,
        }}
      />

      {/* Account Center */}
      <Stack.Screen 
        name="account-center" 
        options={{
          title: 'Account Center',
          headerBackTitle: 'Settings',
        }}
      />

      {/* Feed Preferences */}
      <Stack.Screen 
        name="feed-preferences" 
        options={{
          title: 'Feed Preferences',
          headerBackTitle: 'Settings',
        }}
      />

      {/* Saved & Hidden Content */}
      <Stack.Screen 
        name="saved-content" 
        options={{
          title: 'Saved & Hidden',
          headerBackTitle: 'Settings',
        }}
      />

      {/* Language & Region */}
      <Stack.Screen 
        name="language" 
        options={{
          title: 'Language & Region',
          headerBackTitle: 'Settings',
        }}
      />

      {/* Privacy & Visibility */}
      <Stack.Screen 
        name="privacy" 
        options={{
          title: 'Privacy & Visibility',
          headerBackTitle: 'Settings',
        }}
      />

      {/* Blocked & Muted Accounts */}
      <Stack.Screen 
        name="blocked" 
        options={{
          title: 'Blocked & Muted',
          headerBackTitle: 'Settings',
        }}
      />

      {/* Community Notifications */}
      <Stack.Screen 
        name="notifications" 
        options={{
          title: 'Notifications',
          headerBackTitle: 'Settings',
        }}
      />

      {/* Security & Login */}
      <Stack.Screen 
        name="security" 
        options={{
          title: 'Security & Login',
          headerBackTitle: 'Settings',
        }}
      />

      {/* Linked Accounts */}
      <Stack.Screen 
        name="linked-accounts" 
        options={{
          title: 'Linked Accounts',
          headerBackTitle: 'Settings',
        }}
      />

      {/* Report a Problem */}
      <Stack.Screen 
        name="report" 
        options={{
          title: 'Report a Problem',
          headerBackTitle: 'Settings',
        }}
      />

      {/* About NebulaNet */}
      <Stack.Screen 
        name="about" 
        options={{
          title: 'About NebulaNet',
          headerBackTitle: 'Settings',
        }}
      />

      {/* Additional Screens (for completeness) */}
      <Stack.Screen 
        name="change-password" 
        options={{
          title: 'Change Password',
          headerBackTitle: 'Security',
        }}
      />
      
      <Stack.Screen 
        name="deactivate" 
        options={{
          title: 'Deactivate Account',
          headerBackTitle: 'Account',
          presentation: 'modal',
        }}
      />
      
      <Stack.Screen 
        name="delete-account" 
        options={{
          title: 'Delete Account',
          headerBackTitle: 'Account',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}