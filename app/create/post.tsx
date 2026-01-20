// app/create/post.tsx
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function CreatePostScreen() {
  const { user, profile } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [audience, setAudience] = useState<"public" | "friends" | "private">(
    "public"
  );
  const [allowComments, setAllowComments] = useState(true);

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "We need camera roll permissions to upload photos."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 4,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newImages = result.assets.map((asset) => asset.uri);
      setImages([...images, ...newImages].slice(0, 4)); // Max 4 images
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  const uploadImages = async (): Promise<string[]> => {
    if (images.length === 0) return [];

    const uploadedUrls: string[] = [];

    for (const imageUri of images) {
      try {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const fileExt = imageUri.split(".").pop();
        const fileName = `${user?.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `posts/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("post-images")
          .upload(filePath, blob);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("post-images").getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      } catch (error) {
        console.error("Error uploading image:", error);
        throw new Error("Failed to upload some images");
      }
    }

    return uploadedUrls;
  };

  const handleCreatePost = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert("Error", "Please fill in both title and content");
      return;
    }

    if (!user) {
      Alert.alert("Error", "You must be logged in to create a post");
      return;
    }

    setIsLoading(true);
    try {
      let mediaUrls: string[] = [];
      if (images.length > 0) {
        mediaUrls = await uploadImages();
      }

      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        title: title.trim(),
        content: content.trim(),
        media_urls: mediaUrls,
        audience: audience,
        allow_comments: allowComments,
        likes_count: 0,
        comments_count: 0,
        shares_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      Alert.alert("Success", "Post created successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "Failed to create post. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView style={styles.scrollView}>
        {/* User Header */}
        <View style={styles.userHeader}>
          {profile?.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={styles.userAvatar}
            />
          ) : (
            <View style={styles.userAvatarPlaceholder}>
              <Text style={styles.userAvatarText}>
                {profile?.username?.charAt(0).toUpperCase() || "U"}
              </Text>
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {profile?.full_name || profile?.username}
            </Text>
            <TouchableOpacity
              style={styles.audienceButton}
              onPress={() => {
                const audiences: (typeof audience)[] = [
                  "public",
                  "friends",
                  "private",
                ];
                const currentIndex = audiences.indexOf(audience);
                const nextIndex = (currentIndex + 1) % audiences.length;
                setAudience(audiences[nextIndex]);
              }}
            >
              <Ionicons
                name={
                  audience === "public"
                    ? "earth-outline"
                    : audience === "friends"
                      ? "people-outline"
                      : "lock-closed-outline"
                }
                size={14}
                color="#666"
              />
              <Text style={styles.audienceText}>
                {audience === "public"
                  ? "Public"
                  : audience === "friends"
                    ? "Friends Only"
                    : "Private"}
              </Text>
              <Ionicons name="chevron-down" size={12} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Title Input */}
        <View style={styles.inputGroup}>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Title"
            placeholderTextColor="#999"
            maxLength={100}
          />
          <Text style={styles.charCount}>{title.length}/100</Text>
        </View>

        {/* Content Input */}
        <View style={styles.inputGroup}>
          <TextInput
            style={styles.contentInput}
            value={content}
            onChangeText={setContent}
            placeholder="What's on your mind?"
            placeholderTextColor="#999"
            multiline
            textAlignVertical="top"
            maxLength={1000}
          />
          <Text style={styles.charCount}>{content.length}/1000</Text>
        </View>

        {/* Image Preview */}
        {images.length > 0 && (
          <View style={styles.imagesContainer}>
            {images.map((uri, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#ff3b30" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Add Media Options */}
        <View style={styles.mediaOptions}>
          <TouchableOpacity style={styles.mediaOption} onPress={pickImages}>
            <Ionicons name="image-outline" size={24} color="#007AFF" />
            <Text style={styles.mediaOptionText}>Photo/Video</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mediaOption}
            onPress={() =>
              Alert.alert("Coming Soon", "Location feature coming soon")
            }
          >
            <Ionicons name="location-outline" size={24} color="#007AFF" />
            <Text style={styles.mediaOptionText}>Location</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mediaOption}
            onPress={() =>
              Alert.alert("Coming Soon", "Tagging feature coming soon")
            }
          >
            <Ionicons name="person-outline" size={24} color="#007AFF" />
            <Text style={styles.mediaOptionText}>Tag People</Text>
          </TouchableOpacity>
        </View>

        {/* Post Settings */}
        <View style={styles.settingsSection}>
          <Text style={styles.settingsTitle}>Post Settings</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setAllowComments(!allowComments)}
          >
            <Ionicons
              name={allowComments ? "chatbubble-outline" : "chatbubble"}
              size={20}
              color="#666"
            />
            <Text style={styles.settingText}>
              {allowComments ? "Allow comments" : "Disable comments"}
            </Text>
            <View style={styles.settingToggle}>
              <View
                style={[
                  styles.toggleCircle,
                  allowComments && styles.toggleCircleActive,
                ]}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            title="Post"
            onPress={handleCreatePost}
            loading={isLoading}
            disabled={!title.trim() || !content.trim()}
            style={styles.postButton}
          />

          <TouchableOpacity
            style={styles.saveDraftButton}
            onPress={() =>
              Alert.alert("Draft Saved", "Your post has been saved as draft.")
            }
          >
            <Text style={styles.saveDraftText}>Save as Draft</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  audienceButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#f5f5f5",
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  audienceText: {
    fontSize: 12,
    color: "#666",
  },
  inputGroup: {
    marginBottom: 24,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: "600",
    color: "#000",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  contentInput: {
    fontSize: 16,
    color: "#333",
    minHeight: 150,
    lineHeight: 24,
  },
  charCount: {
    fontSize: 12,
    color: "#999",
    alignSelf: "flex-end",
    marginTop: 4,
  },
  imagesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  imageWrapper: {
    position: "relative",
    width: "48%",
    aspectRatio: 1,
  },
  previewImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "white",
    borderRadius: 12,
  },
  mediaOptions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 32,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#e1e1e1",
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  mediaOption: {
    alignItems: "center",
    gap: 4,
  },
  mediaOptionText: {
    fontSize: 12,
    color: "#007AFF",
  },
  settingsSection: {
    marginBottom: 32,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    gap: 12,
  },
  settingText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  settingToggle: {
    width: 40,
    height: 24,
    backgroundColor: "#e0e0e0",
    borderRadius: 12,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleCircle: {
    width: 20,
    height: 20,
    backgroundColor: "white",
    borderRadius: 10,
  },
  toggleCircleActive: {
    backgroundColor: "#007AFF",
    alignSelf: "flex-end",
  },
  actionButtons: {
    gap: 12,
    marginBottom: 32,
  },
  postButton: {
    backgroundColor: "#007AFF",
  },
  saveDraftButton: {
    alignItems: "center",
    padding: 16,
  },
  saveDraftText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
});
