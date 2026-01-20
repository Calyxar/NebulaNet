// app/create/media.tsx
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useState } from "react";
import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface MediaItem {
  uri: string;
  type: "image" | "video";
  thumbnail?: string;
}

export default function CreateMediaScreen() {
  const { user } = useAuth(); // Removed unused profile
  const [caption, setCaption] = useState("");
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"photos" | "videos">("photos");

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "We need camera roll permissions to upload media."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
        selectedTab === "photos"
          ? ImagePicker.MediaTypeOptions.Images
          : ImagePicker.MediaTypeOptions.Videos,
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.8,
      videoMaxDuration: 60, // 60 seconds max
    });

    if (!result.canceled && result.assets.length > 0) {
      const newMediaItems = await Promise.all(
        result.assets.map(async (asset) => {
          const mediaItem: MediaItem = {
            uri: asset.uri,
            type: asset.type === "image" ? "image" : "video",
          };

          // Generate thumbnail for videos
          if (asset.type === "video") {
            try {
              const { uri } = await VideoThumbnails.getThumbnailAsync(
                asset.uri,
                {
                  time: 0,
                }
              );
              mediaItem.thumbnail = uri;
            } catch (error) {
              console.error("Error generating thumbnail:", error);
            }
          }

          return mediaItem;
        })
      );

      setMediaItems([...mediaItems, ...newMediaItems].slice(0, 10)); // Max 10 items
    }
  };

  const removeMedia = (index: number) => {
    const newMedia = [...mediaItems];
    newMedia.splice(index, 1);
    setMediaItems(newMedia);
  };

  const uploadMedia = async (): Promise<string[]> => {
    if (mediaItems.length === 0) return [];

    const uploadedUrls: string[] = [];

    for (const mediaItem of mediaItems) {
      try {
        const response = await fetch(mediaItem.uri);
        const blob = await response.blob();
        const fileExt = mediaItem.uri.split(".").pop();
        const fileName = `${user?.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `media/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("post-media")
          .upload(filePath, blob);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("post-media").getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      } catch (error) {
        console.error("Error uploading media:", error);
        throw new Error("Failed to upload some media files");
      }
    }

    return uploadedUrls;
  };

  const handleShareMedia = async () => {
    if (mediaItems.length === 0) {
      Alert.alert("Error", "Please select at least one photo or video");
      return;
    }

    if (!user) {
      Alert.alert("Error", "You must be logged in to share media");
      return;
    }

    setIsLoading(true);
    try {
      const mediaUrls = await uploadMedia();

      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        title:
          caption.trim() ||
          `${mediaItems.length} ${mediaItems.length === 1 ? "media" : "media"} shared`,
        content: caption.trim(),
        media_urls: mediaUrls,
        post_type: mediaItems.some((item) => item.type === "video")
          ? "video"
          : "image",
        likes_count: 0,
        comments_count: 0,
        shares_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      Alert.alert("Success", "Media shared successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "Failed to share media. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Media Type Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === "photos" && styles.activeTab]}
          onPress={() => setSelectedTab("photos")}
        >
          <Ionicons
            name="image-outline"
            size={20}
            color={selectedTab === "photos" ? "#007AFF" : "#666"}
          />
          <Text
            style={[
              styles.tabText,
              selectedTab === "photos" && styles.activeTabText,
            ]}
          >
            Photos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === "videos" && styles.activeTab]}
          onPress={() => setSelectedTab("videos")}
        >
          <Ionicons
            name="videocam-outline"
            size={20}
            color={selectedTab === "videos" ? "#007AFF" : "#666"}
          />
          <Text
            style={[
              styles.tabText,
              selectedTab === "videos" && styles.activeTabText,
            ]}
          >
            Videos
          </Text>
        </TouchableOpacity>
      </View>

      {/* Add Media Button */}
      <TouchableOpacity style={styles.addMediaButton} onPress={pickMedia}>
        <Ionicons
          name={selectedTab === "photos" ? "image-outline" : "videocam-outline"}
          size={48}
          color="#ccc"
        />
        <Text style={styles.addMediaText}>
          Add {selectedTab === "photos" ? "Photos" : "Videos"}
        </Text>
        <Text style={styles.addMediaSubtext}>
          {mediaItems.length}/10 items selected
        </Text>
      </TouchableOpacity>

      {/* Media Preview Grid */}
      {mediaItems.length > 0 && (
        <View style={styles.mediaGrid}>
          {mediaItems.map((item, index) => (
            <View key={index} style={styles.mediaItemWrapper}>
              {item.type === "image" ? (
                <Image source={{ uri: item.uri }} style={styles.mediaItem} />
              ) : (
                <View style={styles.videoItem}>
                  <Image
                    source={{ uri: item.thumbnail || item.uri }}
                    style={styles.mediaItem}
                  />
                  <View style={styles.videoOverlay}>
                    <Ionicons name="play-circle" size={32} color="white" />
                  </View>
                </View>
              )}
              <TouchableOpacity
                style={styles.removeMediaButton}
                onPress={() => removeMedia(index)}
              >
                <Ionicons name="close-circle" size={24} color="#ff3b30" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Caption Input */}
      <View style={styles.captionSection}>
        <Text style={styles.sectionTitle}>Add a Caption</Text>
        <TextInput
          style={styles.captionInput}
          value={caption}
          onChangeText={setCaption}
          placeholder={`Describe your ${selectedTab}...`}
          placeholderTextColor="#999"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={500}
        />
        <Text style={styles.charCount}>{caption.length}/500</Text>
      </View>

      {/* Media Details */}
      <View style={styles.detailsSection}>
        <Text style={styles.sectionTitle}>Media Details</Text>

        <View style={styles.detailItem}>
          <Ionicons name="images-outline" size={20} color="#666" />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Media Count</Text>
            <Text style={styles.detailValue}>
              {mediaItems.length} {mediaItems.length === 1 ? "item" : "items"}
            </Text>
          </View>
        </View>

        <View style={styles.detailItem}>
          <Ionicons name="information-circle-outline" size={20} color="#666" />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Content Type</Text>
            <Text style={styles.detailValue}>
              {mediaItems.length === 0
                ? "None selected"
                : selectedTab === "photos"
                  ? "Photos"
                  : "Videos"}
            </Text>
          </View>
        </View>

        <View style={styles.detailItem}>
          <Ionicons name="options-outline" size={20} color="#666" />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Privacy</Text>
            <Text style={styles.detailValue}>Public</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          title={`Share ${selectedTab === "photos" ? "Photos" : "Videos"}`}
          onPress={handleShareMedia}
          loading={isLoading}
          disabled={mediaItems.length === 0}
          style={styles.shareButton}
        />

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
  },
  tabsContainer: {
    flexDirection: "row",
    marginBottom: 24,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  activeTab: {
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#007AFF",
    fontWeight: "600",
  },
  addMediaButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9f9f9",
    borderWidth: 2,
    borderColor: "#e1e1e1",
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 48,
    marginBottom: 24,
  },
  addMediaText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
    marginBottom: 8,
  },
  addMediaSubtext: {
    fontSize: 14,
    color: "#999",
  },
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  mediaItemWrapper: {
    position: "relative",
    width: "32%",
    aspectRatio: 1,
  },
  mediaItem: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  videoItem: {
    position: "relative",
  },
  videoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  removeMediaButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "white",
    borderRadius: 12,
  },
  captionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 16,
  },
  captionInput: {
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  charCount: {
    fontSize: 12,
    color: "#999",
    alignSelf: "flex-end",
    marginTop: 4,
  },
  detailsSection: {
    marginBottom: 32,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    gap: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
  },
  actionButtons: {
    gap: 12,
    marginBottom: 32,
  },
  shareButton: {
    backgroundColor: "#007AFF",
  },
  cancelButton: {
    alignItems: "center",
    padding: 16,
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
});
