import { supabase } from "@/lib/supabase"; // Adjust path to your supabase client
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  Modal,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { v4 as uuidv4 } from "uuid";

interface ChatInputProps {
  onSendMessage: (message: string, attachments?: SupabaseAttachment[]) => void;
  placeholder?: string;
  disabled?: boolean;
  conversationId?: string;
  userId?: string;
}

export interface SupabaseAttachment {
  url: string;
  type: "image" | "video" | "audio" | "file";
  name: string;
  size?: number;
  mimeType?: string;
  duration?: number;
  bucket: string;
  path: string;
}

interface LocalAttachment {
  uri: string;
  type: "image" | "video" | "audio" | "file";
  name: string;
  size?: number;
  mimeType?: string;
  duration?: number;
}

interface Emoji {
  emoji: string;
  name: string;
}

const commonEmojis: Emoji[] = [
  { emoji: "😀", name: "Grinning Face" },
  { emoji: "😂", name: "Face with Tears of Joy" },
  { emoji: "🤣", name: "Rolling on the Floor Laughing" },
  { emoji: "😊", name: "Smiling Face with Smiling Eyes" },
  { emoji: "😍", name: "Smiling Face with Heart-Eyes" },
  { emoji: "🥰", name: "Smiling Face with Hearts" },
  { emoji: "😎", name: "Smiling Face with Sunglasses" },
  { emoji: "🤔", name: "Thinking Face" },
  { emoji: "😴", name: "Sleeping Face" },
  { emoji: "🥺", name: "Pleading Face" },
  { emoji: "❤️", name: "Red Heart" },
  { emoji: "👍", name: "Thumbs Up" },
  { emoji: "👏", name: "Clapping Hands" },
  { emoji: "🙏", name: "Folded Hands" },
  { emoji: "🎉", name: "Party Popper" },
  { emoji: "🔥", name: "Fire" },
  { emoji: "⭐", name: "Star" },
  { emoji: "✨", name: "Sparkles" },
  { emoji: "💯", name: "Hundred Points" },
  { emoji: "🎯", name: "Bullseye" },
];

// Supabase Storage configuration
const BUCKETS = {
  CHAT_MEDIA: "chat-media", // Your Supabase Storage bucket for chat media
  VOICE_MESSAGES: "voice-messages", // Bucket for voice messages
  DOCUMENTS: "documents", // Bucket for documents
};

// Ensure buckets exist (run this once in your app initialization)
export const initializeSupabaseBuckets = async () => {
  try {
    // Check if buckets exist, create if not
    const { data: buckets } = await supabase.storage.listBuckets();
    const existingBuckets = buckets?.map((b) => b.name) || [];

    if (!existingBuckets.includes(BUCKETS.CHAT_MEDIA)) {
      await supabase.storage.createBucket(BUCKETS.CHAT_MEDIA, {
        public: true,
        allowedMimeTypes: ["image/*", "video/*"],
        fileSizeLimit: 52428800, // 50MB
      });
    }

    if (!existingBuckets.includes(BUCKETS.VOICE_MESSAGES)) {
      await supabase.storage.createBucket(BUCKETS.VOICE_MESSAGES, {
        public: true,
        allowedMimeTypes: ["audio/*"],
        fileSizeLimit: 10485760, // 10MB
      });
    }

    if (!existingBuckets.includes(BUCKETS.DOCUMENTS)) {
      await supabase.storage.createBucket(BUCKETS.DOCUMENTS, {
        public: true,
        allowedMimeTypes: ["*/*"],
        fileSizeLimit: 104857600, // 100MB
      });
    }

    console.log("✅ Supabase buckets initialized");
  } catch (error) {
    console.error("❌ Error initializing Supabase buckets:", error);
  }
};

export default function ChatInput({
  onSendMessage,
  placeholder = "Type a message...",
  disabled = false,
  conversationId,
  userId,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [localAttachments, setLocalAttachments] = useState<LocalAttachment[]>(
    [],
  );
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: number;
  }>({});

  const recordingInterval = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Request microphone permissions
  useEffect(() => {
    requestMicrophonePermission();
  }, []);

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
    };
  }, []);

  const requestMicrophonePermission = async () => {
    if (Platform.OS === "android") {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: "Microphone Permission",
            message:
              "This app needs access to your microphone to record voice messages.",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK",
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error("Failed to request microphone permission:", err);
        return false;
      }
    } else {
      const { status } = await Audio.requestPermissionsAsync();
      return status === "granted";
    }
  };

  const handleSend = async () => {
    if ((message.trim() || localAttachments.length > 0) && !isUploading) {
      try {
        setIsUploading(true);

        // Upload attachments to Supabase Storage
        const supabaseAttachments: SupabaseAttachment[] = [];

        if (localAttachments.length > 0) {
          for (const attachment of localAttachments) {
            const uploadedAttachment = await uploadToSupabase(attachment);
            if (uploadedAttachment) {
              supabaseAttachments.push(uploadedAttachment);
            }
          }
        }

        // Call the parent component's onSendMessage with Supabase URLs
        onSendMessage(
          message.trim(),
          supabaseAttachments.length > 0 ? supabaseAttachments : undefined,
        );

        // Reset state
        setMessage("");
        setLocalAttachments([]);
        setUploadProgress({});
        Keyboard.dismiss();
      } catch (error) {
        console.error("Error sending message:", error);
        Alert.alert("Error", "Failed to send message. Please try again.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const uploadToSupabase = async (
    attachment: LocalAttachment,
  ): Promise<SupabaseAttachment | null> => {
    try {
      const fileId = uuidv4();
      let bucket = BUCKETS.CHAT_MEDIA;
      let fileExtension = "jpg";

      // Determine bucket and file extension based on type
      if (attachment.type === "audio") {
        bucket = BUCKETS.VOICE_MESSAGES;
        fileExtension = "m4a";
      } else if (attachment.type === "file") {
        bucket = BUCKETS.DOCUMENTS;
        // Get extension from filename
        const parts = attachment.name.split(".");
        fileExtension = parts.length > 1 ? parts[parts.length - 1] : "bin";
      } else if (attachment.type === "video") {
        fileExtension = "mp4";
      }

      const fileName = `${fileId}.${fileExtension}`;
      const filePath = `${userId || "anonymous"}/${conversationId || "direct"}/${fileName}`;

      // Convert local URI to blob
      const fileInfo = await FileSystem.getInfoAsync(attachment.uri);
      if (!fileInfo.exists) {
        throw new Error("File does not exist");
      }

      // Get file size (handle both FileInfo types)
      const fileSize = "size" in fileInfo ? fileInfo.size : 0;

      let fileBlob: Blob | string;

      if (fileSize > 10 * 1024 * 1024) {
        // 10MB threshold - For large files, use fetch to get blob
        const response = await fetch(attachment.uri);
        fileBlob = await response.blob();
      } else {
        // For smaller files, read as base64
        const base64 = await FileSystem.readAsStringAsync(attachment.uri, {
          encoding: "base64",
        });
        fileBlob = `data:${attachment.mimeType};base64,${base64}`;
      }

      // Upload to Supabase Storage
      const uploadId = `${bucket}-${filePath}`;

      // Note: Supabase JS client doesn't support onUploadProgress in this context
      // We'll simulate progress for large files
      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, fileBlob, {
          contentType: attachment.mimeType || "application/octet-stream",
          upsert: true,
          // Note: onUploadProgress is not available in Supabase JS client v2
          // You would need a custom upload solution for progress tracking
        });

      if (error) {
        console.error("Upload error:", error);
        throw error;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(filePath);

      // Clean up local file after successful upload
      try {
        await FileSystem.deleteAsync(attachment.uri);
      } catch (cleanupError) {
        console.warn("Could not delete local file:", cleanupError);
      }

      // Remove progress tracking
      setUploadProgress((prev) => {
        const newProgress = { ...prev };
        delete newProgress[uploadId];
        return newProgress;
      });

      return {
        url: publicUrl,
        type: attachment.type,
        name: attachment.name,
        size: attachment.size,
        mimeType: attachment.mimeType,
        duration: attachment.duration,
        bucket,
        path: filePath,
      };
    } catch (error) {
      console.error("Error uploading to Supabase:", error);
      Alert.alert(
        "Upload Failed",
        `Failed to upload ${attachment.name}. Please try again.`,
      );
      return null;
    }
  };

  const startRecording = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      setRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);

      // Start recording timer - use NodeJS.Timeout for Node environments
      recordingInterval.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000) as unknown as NodeJS.Timeout;
    } catch (err) {
      console.error("Failed to start recording:", err);
      Alert.alert(
        "Error",
        "Failed to start recording. Please check microphone permissions.",
      );
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      // Create audio attachment
      if (uri) {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        const fileSize = "size" in fileInfo ? fileInfo.size : undefined;

        const audioAttachment: LocalAttachment = {
          uri,
          type: "audio",
          name: `voice-message-${Date.now()}.m4a`,
          size: fileSize,
          mimeType: "audio/m4a",
          duration: recordingDuration,
        };
        setLocalAttachments((prev) => [...prev, audioAttachment]);
      }
    } catch (err) {
      console.error("Failed to stop recording:", err);
    } finally {
      setRecording(null);
      setIsRecording(false);
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
        recordingInterval.current = null;
      }
      setRecordingDuration(0);
    }
  };

  const handleVoiceRecord = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      const hasPermission = await requestMicrophonePermission();
      if (hasPermission) {
        await startRecording();
      } else {
        Alert.alert(
          "Permission Required",
          "Microphone permission is required to record voice messages.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => {
                // Open app settings for permissions
                if (Platform.OS === "ios") {
                  // For iOS, you might need a different approach
                  // Linking.openURL('app-settings:')
                  console.log("Open iOS settings");
                } else {
                  // For Android - You can't directly open settings from JS
                  // You might need to use a native module
                  console.log("Cannot open Android settings directly from JS");
                }
              },
            },
          ],
        );
      }
    }
  };

  const handleAttachment = () => {
    setShowAttachmentOptions(true);
  };

  const pickImage = async () => {
    setShowAttachmentOptions(false);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const duration = asset.duration
          ? Math.floor(asset.duration / 1000)
          : undefined;

        const attachment: LocalAttachment = {
          uri: asset.uri,
          type: asset.type === "video" ? "video" : "image",
          name:
            asset.fileName ||
            `attachment-${Date.now()}.${asset.type === "video" ? "mp4" : "jpg"}`,
          size: asset.fileSize,
          mimeType: asset.mimeType,
          duration,
        };
        setLocalAttachments((prev) => [...prev, attachment]);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const takePhoto = async () => {
    setShowAttachmentOptions(false);

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Camera Permission Required",
          "Camera permission is required to take photos.",
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const attachment: LocalAttachment = {
          uri: asset.uri,
          type: "image",
          name: `photo-${Date.now()}.jpg`,
          size: asset.fileSize,
          mimeType: asset.mimeType,
        };
        setLocalAttachments((prev) => [...prev, attachment]);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  };

  const pickDocument = async () => {
    setShowAttachmentOptions(false);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const attachment: LocalAttachment = {
          uri: asset.uri,
          type: "file",
          name: asset.name || `document-${Date.now()}`,
          size: asset.size,
          mimeType: asset.mimeType,
        };
        setLocalAttachments((prev) => [...prev, attachment]);
      }
    } catch (error) {
      console.error("Error picking document:", error);
      Alert.alert("Error", "Failed to pick document. Please try again.");
    }
  };

  const handleEmoji = () => {
    setShowEmojiPicker(!showEmojiPicker);
    if (!showEmojiPicker) {
      Keyboard.dismiss();
    }
  };

  const insertEmoji = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const removeAttachment = (index: number) => {
    const attachment = localAttachments[index];
    // Clean up local file
    if (attachment.uri) {
      FileSystem.deleteAsync(attachment.uri).catch(console.warn);
    }
    setLocalAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getUploadProgress = (attachment: LocalAttachment) => {
    const uploadId = `${attachment.type}-${attachment.name}`;
    return uploadProgress[uploadId] || 0;
  };

  const getFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown size";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <>
      {/* Attachments Preview */}
      {localAttachments.length > 0 && (
        <View style={styles.attachmentsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {localAttachments.map((attachment, index) => {
              const progress = getUploadProgress(attachment);
              const isUploading = progress > 0 && progress < 100;

              return (
                <View key={index} style={styles.attachmentPreview}>
                  {attachment.type === "image" && (
                    <Image
                      source={{ uri: attachment.uri }}
                      style={styles.previewImage}
                    />
                  )}
                  {attachment.type === "video" && (
                    <View style={styles.videoPreview}>
                      <Ionicons name="videocam" size={24} color="#fff" />
                      <Text style={styles.videoDuration}>
                        {attachment.duration
                          ? formatDuration(attachment.duration)
                          : "00:00"}
                      </Text>
                    </View>
                  )}
                  {attachment.type === "audio" && (
                    <View style={styles.audioPreview}>
                      <Ionicons name="mic" size={24} color="#007AFF" />
                      <Text style={styles.audioDuration}>
                        {formatDuration(attachment.duration || 0)}
                      </Text>
                    </View>
                  )}
                  {attachment.type === "file" && (
                    <View style={styles.filePreview}>
                      <Ionicons
                        name="document-text"
                        size={24}
                        color="#007AFF"
                      />
                      <Text style={styles.fileName} numberOfLines={1}>
                        {attachment.name}
                      </Text>
                      <Text style={styles.fileSize}>
                        {getFileSize(attachment.size)}
                      </Text>
                    </View>
                  )}

                  {isUploading && (
                    <View style={styles.uploadOverlay}>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={styles.uploadProgressText}>
                        {Math.round(progress)}%
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.removeAttachmentButton}
                    onPress={() => removeAttachment(index)}
                    disabled={isUploading}
                  >
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={isUploading ? "#999" : "#ff3b30"}
                    />
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Voice Recording Indicator */}
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>
            Recording... {formatDuration(recordingDuration)}
          </Text>
          <TouchableOpacity
            onPress={stopRecording}
            style={styles.stopRecordingButton}
          >
            <Text style={styles.stopRecordingText}>Stop</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.attachmentButton, disabled && styles.disabledButton]}
          onPress={handleAttachment}
          disabled={disabled || isUploading}
        >
          {isUploading ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Ionicons name="add-circle-outline" size={28} color="#007AFF" />
          )}
        </TouchableOpacity>

        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={[styles.emojiButton, disabled && styles.disabledButton]}
            onPress={handleEmoji}
            disabled={disabled || isUploading}
          >
            <Ionicons name="happy-outline" size={24} color="#666" />
          </TouchableOpacity>

          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              disabled && styles.disabledInput,
              isRecording && styles.recordingInput,
            ]}
            value={message}
            onChangeText={setMessage}
            placeholder={placeholder}
            placeholderTextColor="#999"
            multiline
            maxLength={1000}
            editable={!disabled && !isUploading}
            onFocus={() => {
              setIsRecording(false);
              setShowEmojiPicker(false);
            }}
          />

          {message.trim() || localAttachments.length > 0 ? (
            <TouchableOpacity
              style={[
                styles.sendButton,
                (disabled || isUploading) && styles.disabledButton,
              ]}
              onPress={handleSend}
              disabled={disabled || isUploading}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <Ionicons name="send" size={24} color="#007AFF" />
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.voiceButton,
                (disabled || isUploading) && styles.disabledButton,
              ]}
              onPress={handleVoiceRecord}
              disabled={disabled || isUploading}
            >
              <Ionicons
                name={isRecording ? "mic" : "mic-outline"}
                size={24}
                color={isRecording ? "#ff3b30" : "#666"}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Emoji Picker Modal */}
      <Modal
        visible={showEmojiPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEmojiPicker(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowEmojiPicker(false)}>
          <View style={styles.emojiModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.emojiModalContent}>
                <Text style={styles.emojiModalTitle}>Emojis</Text>
                <FlatList
                  data={commonEmojis}
                  keyExtractor={(item, index) => `${item.emoji}-${index}`}
                  numColumns={6}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.emojiItem}
                      onPress={() => insertEmoji(item.emoji)}
                    >
                      <Text style={styles.emojiText}>{item.emoji}</Text>
                    </TouchableOpacity>
                  )}
                  contentContainerStyle={styles.emojiList}
                />
                <TouchableOpacity
                  style={styles.closeEmojiButton}
                  onPress={() => setShowEmojiPicker(false)}
                >
                  <Text style={styles.closeEmojiText}>Close</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Attachment Options Modal */}
      <Modal
        visible={showAttachmentOptions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAttachmentOptions(false)}
      >
        <TouchableWithoutFeedback
          onPress={() => setShowAttachmentOptions(false)}
        >
          <View style={styles.optionsModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.optionsModalContent}>
                <Text style={styles.optionsModalTitle}>Choose Attachment</Text>

                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={pickImage}
                >
                  <Ionicons name="images-outline" size={28} color="#007AFF" />
                  <Text style={styles.optionText}>Photo & Video Library</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={takePhoto}
                >
                  <Ionicons name="camera-outline" size={28} color="#007AFF" />
                  <Text style={styles.optionText}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={pickDocument}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={28}
                    color="#007AFF"
                  />
                  <Text style={styles.optionText}>Document</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelOptionButton}
                  onPress={() => setShowAttachmentOptions(false)}
                >
                  <Text style={styles.cancelOptionText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e1e1e1",
  },
  attachmentButton: {
    padding: 8,
    marginRight: 8,
    marginBottom: Platform.OS === "ios" ? 8 : 4,
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  inputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#f5f5f5",
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
    maxHeight: 100,
  },
  emojiButton: {
    padding: 4,
    marginRight: 4,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 84,
    paddingHorizontal: 8,
    paddingVertical: Platform.OS === "ios" ? 8 : 4,
  },
  recordingInput: {
    backgroundColor: "#ffebee",
  },
  sendButton: {
    padding: 4,
    marginLeft: 4,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  voiceButton: {
    padding: 4,
    marginLeft: 4,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledInput: {
    opacity: 0.5,
  },

  // Attachments Preview
  attachmentsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f9f9f9",
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  attachmentPreview: {
    marginRight: 8,
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e1e1e1",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  videoPreview: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  videoDuration: {
    color: "#fff",
    fontSize: 12,
    marginTop: 4,
  },
  audioPreview: {
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  audioDuration: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  filePreview: {
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  fileName: {
    fontSize: 10,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  fileSize: {
    fontSize: 9,
    color: "#999",
    marginTop: 2,
  },
  removeAttachmentButton: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#fff",
    borderRadius: 10,
  },
  uploadOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadProgressText: {
    color: "#fff",
    fontSize: 12,
    marginTop: 4,
  },

  // Recording Indicator
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#ffebee",
    borderBottomWidth: 1,
    borderBottomColor: "#ffcdd2",
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#ff3b30",
    marginRight: 8,
  },
  recordingText: {
    flex: 1,
    fontSize: 14,
    color: "#d32f2f",
  },
  stopRecordingButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "#ff3b30",
    borderRadius: 4,
  },
  stopRecordingText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  // Emoji Picker Modal
  emojiModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  emojiModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: "50%",
  },
  emojiModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  emojiList: {
    paddingBottom: 16,
  },
  emojiItem: {
    flex: 1,
    alignItems: "center",
    padding: 8,
  },
  emojiText: {
    fontSize: 28,
  },
  closeEmojiButton: {
    paddingVertical: 12,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#e1e1e1",
  },
  closeEmojiText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },

  // Attachment Options Modal
  optionsModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  optionsModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  optionsModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  optionText: {
    fontSize: 16,
    marginLeft: 12,
    color: "#333",
  },
  cancelOptionButton: {
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  cancelOptionText: {
    fontSize: 16,
    color: "#ff3b30",
    fontWeight: "600",
  },
});
