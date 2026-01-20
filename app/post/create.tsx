import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CreatePostScreen() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [boostPost, setBoostPost] = useState(false);

  const communities = [
    { id: '1', name: 'NebulaNet Photography' },
    { id: '2', name: 'HeartLink Collective' },
    { id: '3', name: 'Farm Harmony' },
    { id: '4', name: 'PartyPlanet Crew' },
  ];

  const handlePost = () => {
    // Handle post creation
    console.log('Posting:', { title, body, selectedCommunity, isPublic, boostPost });
    router.back();
  };

  const handleSaveDraft = () => {
    // Handle save as draft
    console.log('Saving draft:', { title, body, selectedCommunity, isPublic, boostPost });
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Post</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Title</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="Enter post title"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
          <Text style={styles.charCount}>{title.length}/100</Text>
        </View>

        {/* Body Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Body Text (Optional)</Text>
          <TextInput
            style={styles.bodyInput}
            placeholder="What's on your mind?"
            value={body}
            onChangeText={setBody}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{body.length}/5000</Text>
        </View>

        {/* Community Selection */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Community</Text>
          <TouchableOpacity 
            style={styles.communitySelector}
            onPress={() => {
              // Show community selection modal
            }}
          >
            <Text style={selectedCommunity ? styles.communitySelected : styles.communityPlaceholder}>
              {selectedCommunity || 'Select a community'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
          
          {selectedCommunity && (
            <View style={styles.selectedCommunity}>
              <Text style={styles.selectedCommunityText}>{selectedCommunity}</Text>
              <TouchableOpacity onPress={() => setSelectedCommunity(null)}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          )}

          {/* Community Suggestions */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.communitySuggestions}>
            {communities.map((community) => (
              <TouchableOpacity
                key={community.id}
                style={styles.communityChip}
                onPress={() => setSelectedCommunity(community.name)}
              >
                <Text style={styles.communityChipText}>{community.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Location */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Add Location</Text>
          <TouchableOpacity 
            style={styles.locationButton}
            onPress={() => {
              // Show location picker
            }}
          >
            <Ionicons name="location-outline" size={20} color="#007AFF" />
            <Text style={styles.locationButtonText}>
              Add location
            </Text>
          </TouchableOpacity>
        </View>

        {/* Privacy Settings */}
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Share Post to Public</Text>
            <Text style={styles.settingDescription}>
              Make this post visible to everyone
            </Text>
          </View>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{ false: '#e1e1e1', true: '#007AFF' }}
            thumbColor={isPublic ? '#fff' : '#fff'}
          />
        </View>

        {/* Boost Post */}
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Boost Post</Text>
            <Text style={styles.settingDescription}>
              Promote your post to reach more people
            </Text>
          </View>
          <Switch
            value={boostPost}
            onValueChange={setBoostPost}
            trackColor={{ false: '#e1e1e1', true: '#007AFF' }}
            thumbColor={boostPost ? '#fff' : '#fff'}
          />
        </View>

        {/* Media Upload */}
        <View style={styles.mediaSection}>
          <Text style={styles.mediaTitle}>Add Media</Text>
          <View style={styles.mediaButtons}>
            <TouchableOpacity style={styles.mediaButton}>
              <Ionicons name="image-outline" size={24} color="#007AFF" />
              <Text style={styles.mediaButtonText}>Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaButton}>
              <Ionicons name="videocam-outline" size={24} color="#007AFF" />
              <Text style={styles.mediaButtonText}>Video</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaButton}>
              <Ionicons name="document-outline" size={24} color="#007AFF" />
              <Text style={styles.mediaButtonText}>File</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.draftButton]}
          onPress={handleSaveDraft}
        >
          <Text style={styles.draftButtonText}>Save as Draft</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.postButton]}
          onPress={handlePost}
          disabled={!title.trim()}
        >
          <Text style={styles.postButtonText}>Post</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerRight: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  titleInput: {
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    backgroundColor: '#fff',
  },
  bodyInput: {
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 150,
    backgroundColor: '#fff',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  communitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#fff',
  },
  communityPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  communitySelected: {
    fontSize: 16,
    color: '#333',
  },
  selectedCommunity: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  selectedCommunityText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  communitySuggestions: {
    marginTop: 12,
  },
  communityChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    marginRight: 8,
  },
  communityChipText: {
    fontSize: 14,
    color: '#333',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#fff',
  },
  locationButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 8,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  mediaSection: {
    marginTop: 24,
  },
  mediaTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  mediaButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  mediaButton: {
    alignItems: 'center',
    padding: 12,
  },
  mediaButtonText: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
    backgroundColor: '#fff',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  draftButton: {
    backgroundColor: '#f5f5f5',
    marginRight: 12,
  },
  draftButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  postButton: {
    backgroundColor: '#007AFF',
  },
  postButtonDisabled: {
    opacity: 0.5,
  },
  postButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});