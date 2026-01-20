// app/settings/account-center.tsx
import { SettingsGroup, SettingsItem } from '@/components/settings';
import Button from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function AccountCenterScreen() {
  const { user, profile, updateProfile } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    username: profile?.username || '',
    full_name: profile?.full_name || '',
    bio: profile?.bio || '',
    email: user?.email || '',
  });

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({
        username: formData.username,
        full_name: formData.full_name,
        bio: formData.bio,
      });
      setEditMode(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  // Fixed navigation functions
  const navigateToChangePassword = () => {
    router.push('/settings/change-password' as any);
  };

  const navigateToDeactivate = () => {
    router.push('/settings/deactivate' as any);
  };

  const navigateToDelete = () => {
    router.push('/settings/delete-account' as any);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account Center</Text>
        <Text style={styles.headerDescription}>
          Manage your account information and profile details
        </Text>
      </View>

      <SettingsGroup title="Profile Information">
        <View style={styles.formGroup}>
          <Text style={styles.label}>Username</Text>
          {editMode ? (
            <TextInput
              style={styles.input}
              value={formData.username}
              onChangeText={(text) => setFormData({ ...formData, username: text })}
              placeholder="Enter username"
              autoCapitalize="none"
            />
          ) : (
            <Text style={styles.value}>{profile?.username}</Text>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Full Name</Text>
          {editMode ? (
            <TextInput
              style={styles.input}
              value={formData.full_name}
              onChangeText={(text) => setFormData({ ...formData, full_name: text })}
              placeholder="Enter your full name"
            />
          ) : (
            <Text style={styles.value}>{profile?.full_name || 'Not set'}</Text>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Bio</Text>
          {editMode ? (
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.bio}
              onChangeText={(text) => setFormData({ ...formData, bio: text })}
              placeholder="Tell us about yourself"
              multiline
              numberOfLines={3}
            />
          ) : (
            <Text style={styles.value}>{profile?.bio || 'No bio yet'}</Text>
          )}
        </View>
      </SettingsGroup>

      <SettingsGroup title="Account Information">
        <View style={styles.formGroup}>
          <Text style={styles.label}>Email Address</Text>
          <Text style={styles.value}>{user?.email}</Text>
          <Text style={styles.emailNote}>
            {user?.email_confirmed_at 
              ? '✓ Email verified' 
              : '⚠ Email not verified'}
          </Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Account Created</Text>
          <Text style={styles.value}>
            {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
          </Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Last Login</Text>
          <Text style={styles.value}>
            {profile?.last_login 
              ? new Date(profile.last_login).toLocaleString() 
              : 'N/A'}
          </Text>
        </View>
      </SettingsGroup>

      <SettingsGroup title="Account Actions">
        <SettingsItem
          title="Change Email"
          description="Update your email address"
          icon="mail-outline"
          onPress={() => Alert.alert('Coming Soon', 'Email change feature coming soon')}
        />
        <SettingsItem
          title="Change Password"
          description="Update your password"
          icon="key-outline"
          onPress={navigateToChangePassword} // Use fixed function
        />
        <SettingsItem
          title="Download Your Data"
          description="Request a copy of your data"
          icon="download-outline"
          onPress={() => Alert.alert('Coming Soon', 'Data export feature coming soon')}
        />
        <SettingsItem
          title="Deactivate Account"
          description="Temporarily disable your account"
          icon="pause-circle-outline"
          danger
          onPress={navigateToDeactivate} // Use fixed function
        />
        <SettingsItem
          title="Delete Account"
          description="Permanently delete your account"
          icon="trash-outline"
          danger
          onPress={navigateToDelete} // Use fixed function
        />
      </SettingsGroup>

      <View style={styles.buttonContainer}>
        {editMode ? (
          <>
            <Button
              title="Save Changes"
              onPress={handleSave}
              loading={updateProfile.isPending}
              style={styles.saveButton}
            />
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => {
                setEditMode(false);
                setFormData({
                  username: profile?.username || '',
                  full_name: profile?.full_name || '',
                  bio: profile?.bio || '',
                  email: user?.email || '',
                });
              }}
              style={styles.cancelButton}
            />
          </>
        ) : (
          <Button
            title="Edit Profile"
            onPress={() => setEditMode(true)}
            style={styles.editButton}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  headerDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  formGroup: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  value: {
    fontSize: 16,
    color: '#000',
  },
  emailNote: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  input: {
    fontSize: 16,
    color: '#000',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    padding: 20,
  },
  editButton: {
    marginTop: 20,
  },
  saveButton: {
    marginBottom: 12,
  },
  cancelButton: {
    backgroundColor: 'transparent',
  },
});