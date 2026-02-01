import { createStory, uploadStoryMedia } from "@/lib/queries/stories";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type MediaType = "image" | "video";

export default function CreateStoryScreen() {
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  /* -------------------- PICK MEDIA -------------------- */

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Allow access to your photos/videos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    setMediaUri(asset.uri);
    setMediaType(asset.type === "video" ? "video" : "image");
  };

  /* -------------------- SUBMIT STORY -------------------- */

  const handlePostStory = async () => {
    if (!mediaUri || !mediaType) {
      Alert.alert("Missing media", "Please select an image or video.");
      return;
    }

    try {
      setUploading(true);

      // 1️⃣ Upload media
      const uploaded = await uploadStoryMedia(mediaUri, mediaType);

      // 2️⃣ Create story row
      await createStory({
        media_url: uploaded.publicUrl,
        media_type: mediaType,
        caption: caption.trim() || null,
      });

      Alert.alert("Story posted", "Your story is now live 🎉");
      router.back();
    } catch (e: any) {
      console.error("Story upload error:", e);
      Alert.alert("Error", e?.message ?? "Failed to post story");
    } finally {
      setUploading(false);
    }
  };

  /* -------------------- UI -------------------- */

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="close" size={24} color="#000" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>New Story</Text>

        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Media preview / picker */}
        <TouchableOpacity
          style={styles.mediaPicker}
          onPress={pickMedia}
          activeOpacity={0.85}
        >
          {mediaUri ? (
            <>
              <Image source={{ uri: mediaUri }} style={styles.mediaPreview} />
              <View style={styles.mediaBadge}>
                <Ionicons
                  name={mediaType === "video" ? "videocam" : "image"}
                  size={16}
                  color="#fff"
                />
              </View>
            </>
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name="add" size={42} color="#7C3AED" />
              <Text style={styles.placeholderText}>
                Tap to select image or video
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Caption */}
        <TextInput
          value={caption}
          onChangeText={setCaption}
          placeholder="Add a caption…"
          placeholderTextColor="#9CA3AF"
          style={styles.captionInput}
          maxLength={200}
          multiline
        />

        {/* Post button */}
        <TouchableOpacity
          onPress={handlePostStory}
          disabled={uploading}
          style={[styles.postButton, uploading && styles.postButtonDisabled]}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.postButtonText}>Share Story</Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* -------------------- STYLES -------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#000",
  },

  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  body: {
    flex: 1,
    padding: 16,
  },

  mediaPicker: {
    width: "100%",
    height: 360,
    borderRadius: 24,
    backgroundColor: "#F3ECFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 16,
  },

  mediaPreview: {
    width: "100%",
    height: "100%",
  },

  mediaBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#7C3AED",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  placeholder: {
    alignItems: "center",
    gap: 10,
  },

  placeholderText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },

  captionInput: {
    minHeight: 80,
    borderRadius: 16,
    backgroundColor: "#F9FAFB",
    padding: 14,
    fontSize: 15,
    color: "#111827",
    marginBottom: 20,
  },

  postButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },

  postButtonDisabled: {
    opacity: 0.6,
  },

  postButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});
