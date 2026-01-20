import MediaUpload, { MediaItem } from '@/components/media/MediaUpload';
import MediaGallery from '@/components/post/MediaGallery'; // Fixed import path
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface Community {
  id: string;
  name: string;
  slug: string;
}

interface EnhancedCreatePostFormProps {
  initialTitle?: string;
  initialContent?: string;
  initialMedia?: MediaItem[];
  selectedCommunity?: Community | null;
  isPublic?: boolean;
  boostPost?: boolean;
  communities?: Community[];
  onSubmit: (data: {
    title: string;
    content: string;
    media: MediaItem[];
    community: Community | null;
    isPublic: boolean;
    boostPost: boolean;
  }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function EnhancedCreatePostForm({
  initialTitle = '',
  initialContent = '',
  initialMedia = [],
  selectedCommunity: initialCommunity = null,
  isPublic: initialIsPublic = true,
  boostPost: initialBoostPost = false,
  communities = [],
  onSubmit,
  onCancel,
  isLoading = false,
}: EnhancedCreatePostFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [media, setMedia] = useState<MediaItem[]>(initialMedia);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(initialCommunity);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [boostPost, setBoostPost] = useState(initialBoostPost);
  const [showCommunityPicker, setShowCommunityPicker] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [showPoll, setShowPoll] = useState(false);
  const [pollDays, setPollDays] = useState(1);

  const handleSubmit = () => {
    onSubmit({
      title,
      content,
      media,
      community: selectedCommunity,
      isPublic,
      boostPost,
    });
  };

  const canSubmit = title.trim().length > 0 || media.length > 0;

  const addPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      const newOptions = [...pollOptions];
      newOptions.splice(index, 1);
      setPollOptions(newOptions);
    }
  };

  const updatePollOption = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  // Convert MediaItem[] to string[] for MediaGallery
  const mediaUris = media.map(item => item.uri);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Title Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="What's your post about?"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
            editable={!isLoading}
          />
          <Text style={styles.charCount}>{title.length}/100</Text>
        </View>

        {/* Content Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Content</Text>
          <TextInput
            style={styles.contentInput}
            placeholder="Share your thoughts, ideas, or experiences..."
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={5000}
            editable={!isLoading}
          />
          <Text style={styles.charCount}>{content.length}/5000</Text>
        </View>

        {/* Media Upload */}
        <MediaUpload
          initialMedia={media}
          onMediaChange={setMedia}
          maxFiles={10}
          maxSize={100}
          allowedTypes={['image', 'video', 'audio', 'document', 'gif']}
          disabled={isLoading}
        />

        {/* Media Preview */}
        {media.length > 0 && (
          <View style={styles.mediaPreviewSection}>
            <Text style={styles.sectionTitle}>Media Preview</Text>
            <MediaGallery media={mediaUris} />
          </View>
        )}

        {/* Poll Section */}
        <TouchableOpacity
          style={styles.pollToggle}
          onPress={() => setShowPoll(!showPoll)}
          disabled={isLoading}
        >
          <Ionicons name="pie-chart-outline" size={20} color="#007AFF" />
          <Text style={styles.pollToggleText}>Add Poll</Text>
        </TouchableOpacity>

        {showPoll && (
          <View style={styles.pollSection}>
            <Text style={styles.sectionTitle}>Create Poll</Text>
            
            {pollOptions.map((option, index) => (
              <View key={index} style={styles.pollOption}>
                <TextInput
                  style={styles.pollInput}
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChangeText={(value) => updatePollOption(index, value)}
                  editable={!isLoading}
                />
                {pollOptions.length > 2 && (
                  <TouchableOpacity
                    style={styles.removePollOption}
                    onPress={() => removePollOption(index)}
                    disabled={isLoading}
                  >
                    <Ionicons name="close-circle" size={20} color="#ff3b30" />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {pollOptions.length < 6 && (
              <TouchableOpacity
                style={styles.addPollOption}
                onPress={addPollOption}
                disabled={isLoading}
              >
                <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
                <Text style={styles.addPollOptionText}>Add Option</Text>
              </TouchableOpacity>
            )}

            <View style={styles.pollDuration}>
              <Text style={styles.pollDurationLabel}>Poll Duration:</Text>
              <View style={styles.pollDurationButtons}>
                {[1, 3, 7, 14].map((days) => (
                  <TouchableOpacity
                    key={days}
                    style={[
                      styles.durationButton,
                      pollDays === days && styles.durationButtonActive,
                    ]}
                    onPress={() => setPollDays(days)}
                    disabled={isLoading}
                  >
                    <Text style={[
                      styles.durationButtonText,
                      pollDays === days && styles.durationButtonTextActive,
                    ]}>
                      {days} day{days > 1 ? 's' : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Community Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Community</Text>
          <TouchableOpacity
            style={styles.communitySelector}
            onPress={() => setShowCommunityPicker(!showCommunityPicker)}
            disabled={isLoading}
          >
            <Text style={selectedCommunity ? styles.communitySelected : styles.communityPlaceholder}>
              {selectedCommunity ? selectedCommunity.name : 'Select a community'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>

          {selectedCommunity && (
            <View style={styles.selectedCommunity}>
              <Text style={styles.selectedCommunityText}>{selectedCommunity.name}</Text>
              <TouchableOpacity 
                onPress={() => setSelectedCommunity(null)}
                disabled={isLoading}
              >
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Privacy & Boost Settings */}
        <View style={styles.settingGroup}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Share to Public</Text>
              <Text style={styles.settingDescription}>
                Anyone can see this post
              </Text>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              disabled={isLoading}
              trackColor={{ false: '#e1e1e1', true: '#007AFF' }}
              thumbColor={isPublic ? '#fff' : '#fff'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Boost Post</Text>
              <Text style={styles.settingDescription}>
                Reach more people
              </Text>
            </View>
            <Switch
              value={boostPost}
              onValueChange={setBoostPost}
              disabled={isLoading}
              trackColor={{ false: '#e1e1e1', true: '#007AFF' }}
              thumbColor={boostPost ? '#fff' : '#fff'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Comments</Text>
              <Text style={styles.settingDescription}>
                Allow comments on this post
              </Text>
            </View>
            <Switch
              value={true}
              onValueChange={() => {}}
              disabled={isLoading}
              trackColor={{ false: '#e1e1e1', true: '#007AFF' }}
              thumbColor="#fff"
            />
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onCancel}
          disabled={isLoading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.submitButton,
            (!canSubmit || isLoading) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit || isLoading}
        >
          {isLoading ? (
            <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
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
  contentInput: {
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    backgroundColor: '#fff',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  mediaPreviewSection: {
    marginBottom: 20,
  },
  pollToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    marginBottom: 16,
  },
  pollToggleText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 8,
  },
  pollSection: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  pollOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pollInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  removePollOption: {
    marginLeft: 8,
    padding: 4,
  },
  addPollOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    justifyContent: 'center',
  },
  addPollOptionText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 8,
  },
  pollDuration: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
  },
  pollDurationLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  pollDurationButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  durationButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
  },
  durationButtonActive: {
    backgroundColor: '#007AFF',
  },
  durationButtonText: {
    fontSize: 14,
    color: '#666',
  },
  durationButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
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
  settingGroup: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
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
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
    backgroundColor: '#fff',
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    marginRight: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});