import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { Camera } from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export type MediaType = 'image' | 'video' | 'document' | 'audio' | 'gif';

export interface MediaItem {
  id: string;
  uri: string;
  type: MediaType;
  name?: string;
  size?: number;
  duration?: number;
  thumbnail?: string;
}

interface MediaUploadProps {
  maxFiles?: number;
  maxSize?: number; // in MB
  allowedTypes?: MediaType[];
  onMediaChange?: (media: MediaItem[]) => void;
  initialMedia?: MediaItem[];
  disabled?: boolean;
}

export default function MediaUpload({
  maxFiles = 10,
  maxSize = 50, // 50MB
  allowedTypes = ['image', 'video', 'document', 'audio', 'gif'],
  onMediaChange,
  initialMedia = [],
  disabled = false,
}: MediaUploadProps) {
  const [media, setMedia] = useState<MediaItem[]>(initialMedia);
  const [uploading] = useState(false);
  const [, setCameraPermission] = useState(false); // Using comma to ignore the first value

  const checkPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need access to your media library to upload files.',
          [{ text: 'OK' }]
        );
        return false;
      }
    }
    return true;
  };

  const checkCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setCameraPermission(status === 'granted');
    return status === 'granted';
  };

  const pickImage = async () => {
    const hasPermission = await checkPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: maxFiles - media.length,
      });

      if (!result.canceled) {
        const newMedia: MediaItem[] = result.assets.map((asset, index) => ({
          id: Date.now().toString() + index,
          uri: asset.uri,
          type: (asset.type === 'video' ? 'video' : 'image') as MediaType,
          name: asset.fileName || `media_${Date.now()}_${index}`,
          size: asset.fileSize || 0,
          duration: asset.duration ?? undefined,
          thumbnail: asset.uri,
        }));
        addMedia(newMedia);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    const hasPermission = await checkCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled) {
        const newMedia: MediaItem[] = [{
          id: Date.now().toString(),
          uri: result.assets[0].uri,
          type: 'image',
          name: `photo_${Date.now()}.jpg`,
          thumbnail: result.assets[0].uri,
        }];
        addMedia(newMedia);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const recordVideo = async () => {
    const hasPermission = await checkCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.8,
        videoMaxDuration: 60, // 60 seconds max
      });

      if (!result.canceled) {
        const newMedia: MediaItem[] = [{
          id: Date.now().toString(),
          uri: result.assets[0].uri,
          type: 'video',
          name: `video_${Date.now()}.mp4`,
          duration: result.assets[0].duration ?? undefined,
          thumbnail: result.assets[0].uri,
        }];
        addMedia(newMedia);
      }
    } catch (error) {
      console.error('Error recording video:', error);
      Alert.alert('Error', 'Failed to record video');
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
      });

      if (!result.canceled) {
        const newMedia: MediaItem[] = result.assets.map((asset, index) => ({
          id: Date.now().toString() + index,
          uri: asset.uri,
          type: 'document',
          name: asset.name || `document_${Date.now()}_${index}`,
          size: asset.size || 0,
        }));
        addMedia(newMedia);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const pickAudio = async () => {
    const hasPermission = await checkPermissions();
    if (!hasPermission) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        multiple: true,
      });

      if (!result.canceled) {
        const newMedia: MediaItem[] = result.assets.map((asset, index) => ({
          id: Date.now().toString() + index,
          uri: asset.uri,
          type: 'audio',
          name: asset.name || `audio_${Date.now()}_${index}`,
          size: asset.size || 0,
        }));
        addMedia(newMedia);
      }
    } catch (error) {
      console.error('Error picking audio:', error);
      Alert.alert('Error', 'Failed to pick audio file');
    }
  };

  const addMedia = (newMedia: MediaItem[]) => {
    // Check file size limits
    const oversizedFiles = newMedia.filter(item => item.size && item.size > maxSize * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      Alert.alert(
        'File Too Large',
        `Some files exceed the ${maxSize}MB limit and were not added.`,
        [{ text: 'OK' }]
      );
      newMedia = newMedia.filter(item => !item.size || item.size <= maxSize * 1024 * 1024);
    }

    // Check total files limit
    const totalFiles = media.length + newMedia.length;
    if (totalFiles > maxFiles) {
      Alert.alert(
        'Too Many Files',
        `You can only upload up to ${maxFiles} files.`,
        [{ text: 'OK' }]
      );
      return;
    }

    const updatedMedia = [...media, ...newMedia];
    setMedia(updatedMedia);
    onMediaChange?.(updatedMedia);
  };

  const removeMedia = (id: string) => {
    const updatedMedia = media.filter(item => item.id !== id);
    setMedia(updatedMedia);
    onMediaChange?.(updatedMedia);
  };

  const getFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderMediaItem = (item: MediaItem) => {
    const getIcon = () => {
      switch (item.type) {
        case 'image':
          return <Ionicons name="image" size={24} color="#fff" />;
        case 'video':
          return <Ionicons name="videocam" size={24} color="#fff" />;
        case 'document':
          return <Ionicons name="document-text" size={24} color="#fff" />;
        case 'audio':
          return <Ionicons name="musical-notes" size={24} color="#fff" />;
        case 'gif':
          return <Ionicons name="logo-octocat" size={24} color="#fff" />;
        default:
          return <Ionicons name="document" size={24} color="#fff" />;
      }
    };

    return (
      <View key={item.id} style={styles.mediaItem}>
        <View style={styles.mediaPreview}>
          {item.type === 'image' || item.type === 'gif' ? (
            <Image 
              source={{ uri: item.uri }} 
              style={styles.mediaImage}
              resizeMode="cover"
            />
          ) : item.type === 'video' ? (
            <Video
              source={{ uri: item.uri }}
              style={styles.mediaVideo}
              resizeMode={ResizeMode.COVER}
              useNativeControls
              isLooping
            />
          ) : (
            <View style={styles.mediaPlaceholder}>
              {getIcon()}
              <Text style={styles.mediaPlaceholderText}>
                {item.type.toUpperCase()}
              </Text>
            </View>
          )}
          
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removeMedia(item.id)}
            disabled={disabled}
          >
            <Ionicons name="close-circle" size={24} color="#ff3b30" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.mediaInfo}>
          <Text style={styles.mediaName} numberOfLines={1}>
            {item.name || `File ${item.id}`}
          </Text>
          <View style={styles.mediaMeta}>
            <Text style={styles.mediaType}>{item.type}</Text>
            {item.size && (
              <Text style={styles.mediaSize}>{getFileSize(item.size)}</Text>
            )}
            {item.duration && (
              <Text style={styles.mediaDuration}>{getDuration(item.duration)}</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  const screenWidth = Dimensions.get('window').width;

  return (
    <View style={[styles.container, { maxWidth: screenWidth }]}>
      {/* Upload Buttons */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.uploadButtons}
      >
        {allowedTypes.includes('image') && (
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={pickImage}
            disabled={disabled || media.length >= maxFiles}
          >
            <Ionicons name="image-outline" size={28} color="#007AFF" />
            <Text style={styles.uploadButtonText}>Photos</Text>
          </TouchableOpacity>
        )}

        {allowedTypes.includes('image') && (
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={takePhoto}
            disabled={disabled || media.length >= maxFiles}
          >
            <Ionicons name="camera-outline" size={28} color="#007AFF" />
            <Text style={styles.uploadButtonText}>Camera</Text>
          </TouchableOpacity>
        )}

        {allowedTypes.includes('video') && (
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={recordVideo}
            disabled={disabled || media.length >= maxFiles}
          >
            <Ionicons name="videocam-outline" size={28} color="#007AFF" />
            <Text style={styles.uploadButtonText}>Video</Text>
          </TouchableOpacity>
        )}

        {allowedTypes.includes('document') && (
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={pickDocument}
            disabled={disabled || media.length >= maxFiles}
          >
            <Ionicons name="document-outline" size={28} color="#007AFF" />
            <Text style={styles.uploadButtonText}>Files</Text>
          </TouchableOpacity>
        )}

        {allowedTypes.includes('audio') && (
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={pickAudio}
            disabled={disabled || media.length >= maxFiles}
          >
            <Ionicons name="musical-notes-outline" size={28} color="#007AFF" />
            <Text style={styles.uploadButtonText}>Audio</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Media List */}
      {media.length > 0 && (
        <View style={styles.mediaList}>
          <View style={styles.mediaListHeader}>
            <Text style={styles.mediaListTitle}>
              Media ({media.length}/{maxFiles})
            </Text>
            <TouchableOpacity
              onPress={() => setMedia([])}
              disabled={disabled}
            >
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.mediaScroll}
          >
            {media.map(renderMediaItem)}
          </ScrollView>
        </View>
      )}

      {/* Upload Status */}
      {uploading && (
        <View style={styles.uploadStatus}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.uploadStatusText}>Uploading...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  uploadButtons: {
    marginBottom: 16,
  },
  uploadButton: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    minWidth: 80,
  },
  uploadButtonText: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
    textAlign: 'center',
  },
  mediaList: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
  },
  mediaListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mediaListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  clearAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  mediaScroll: {
    flexDirection: 'row',
  },
  mediaItem: {
    width: 140,
    marginRight: 12,
  },
  mediaPreview: {
    height: 100,
    borderRadius: 8,
    backgroundColor: '#333',
    overflow: 'hidden',
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  mediaVideo: {
    width: '100%',
    height: '100%',
  },
  mediaPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaPlaceholderText: {
    fontSize: 10,
    color: '#fff',
    marginTop: 4,
    opacity: 0.8,
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  mediaInfo: {
    marginTop: 8,
  },
  mediaName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  mediaMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  mediaType: {
    fontSize: 10,
    color: '#666',
    textTransform: 'uppercase',
  },
  mediaSize: {
    fontSize: 10,
    color: '#666',
  },
  mediaDuration: {
    fontSize: 10,
    color: '#666',
  },
  uploadStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
  },
  uploadStatusText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 8,
  },
});