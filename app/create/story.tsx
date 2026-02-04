// app/create/story.tsx - COMPLETED (Private bucket ready + Android content:// safe)
import { createStory, uploadStoryMedia } from "@/lib/queries/stories";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
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

  const canPost = useMemo(
    () => !!mediaUri && !!mediaType && !uploading,
    [mediaUri, mediaType, uploading],
  );

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

    const asset = result.assets?.[0];
    if (!asset?.uri) {
      Alert.alert("Error", "Could not read selected media.");
      return;
    }

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

      // 1) Upload media to Storage (returns a PATH for private buckets)
      //    This fixes Android content:// issues because uploadStoryMedia reads bytes via expo-file-system.
      const uploaded = await uploadStoryMedia(mediaUri, mediaType);
      // uploaded.path example: `${user.id}/${Date.now()}.jpg`

      // 2) Create story row (store the PATH in DB)
      await createStory({
        media_url: uploaded.path, // ✅ store path, not public url
        media_type: mediaType,
        caption: caption.trim() || null,
        expires_in_hours: 24,
      });

      Alert.alert("Story posted", "Your story is now live 🎉");
      router.back();
    } catch (e: any) {
      console.error("Story upload error:", e);

      // Helpful message for the exact Android failure case
      const msg =
        typeof e?.message === "string" ? e.message : "Failed to post story";

      Alert.alert("Error", msg);
    } finally {
      setUploading(false);
    }
  };

  /* -------------------- UI -------------------- */

  return (
    <>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />

      <LinearGradient
        colors={["#DCEBFF", "#EEF4FF", "#FFFFFF"]}
        locations={[0, 0.45, 1]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safe}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.circleBtn}
              onPress={() => router.back()}
              activeOpacity={0.85}
              disabled={uploading}
            >
              <Ionicons name="close" size={22} color="#111827" />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>New Story</Text>
              <Text style={styles.headerSub}>
                Share a moment with your community
              </Text>
            </View>

            <View style={{ width: 44 }} />
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
              disabled={uploading}
            >
              {mediaUri ? (
                <>
                  <Image
                    source={{ uri: mediaUri }}
                    style={styles.mediaPreview}
                  />
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
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Caption (Optional)</Text>
              <TextInput
                value={caption}
                onChangeText={setCaption}
                placeholder="Add a caption…"
                placeholderTextColor="#9CA3AF"
                style={styles.captionInput}
                maxLength={200}
                multiline
                editable={!uploading}
              />
              <Text style={styles.counter}>{caption.length}/200</Text>
            </View>

            {/* Post button */}
            <TouchableOpacity
              onPress={handlePostStory}
              disabled={!canPost}
              style={[
                styles.postButton,
                (!canPost || uploading) && styles.postButtonDisabled,
              ]}
              activeOpacity={0.9}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.postButtonText}>Share Story</Text>
              )}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}

/* -------------------- STYLES -------------------- */

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },

  header: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#111827" },
  headerSub: {
    marginTop: 2,
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },

  body: {
    flex: 1,
    padding: 18,
  },

  mediaPicker: {
    width: "100%",
    height: 380,
    borderRadius: 24,
    backgroundColor: "#F3ECFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: Platform.OS === "android" ? 0.08 : 0.06,
    shadowRadius: 16,
    elevation: 2,
  },

  mediaPreview: {
    width: "100%",
    height: "100%",
  },

  mediaBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    backgroundColor: "#7C3AED",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  placeholder: {
    alignItems: "center",
    gap: 12,
  },

  placeholderText: {
    fontSize: 14.5,
    color: "#6B7280",
    fontWeight: "700",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: Platform.OS === "android" ? 0.08 : 0.06,
    shadowRadius: 16,
    elevation: 2,
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 10,
  },

  captionInput: {
    minHeight: 90,
    fontSize: 14.5,
    color: "#111827",
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(17,24,39,0.03)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.06)",
    textAlignVertical: "top",
  },

  counter: {
    marginTop: 8,
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "700",
    alignSelf: "flex-end",
  },

  postButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },

  postButtonDisabled: {
    opacity: 0.6,
  },

  postButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
});
