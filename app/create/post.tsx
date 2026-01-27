// app/create/post.tsx
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CreatePostScreen() {
  const [title, setTitle] = useState("");
  const [bodyText, setBodyText] = useState("");
  // ✅ Fixed: Removed unused setSelectedCommunity
  const [selectedCommunity] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const handleSaveDraft = () => {
    Alert.alert("Draft Saved", "Your post has been saved as a draft.");
  };

  const handlePost = () => {
    if (!title.trim()) {
      Alert.alert("Title Required", "Please enter a title for your post.");
      return;
    }

    Alert.alert("Success", "Your post has been created!", [
      { text: "OK", onPress: () => router.back() },
    ]);
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#E8EAF6" />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Post</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Main Input Card */}
          <View style={styles.inputCard}>
            <TextInput
              style={styles.titleInput}
              placeholder="Title"
              placeholderTextColor="#999"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
            <TextInput
              style={styles.bodyInput}
              placeholder="Body Text (Optional)"
              placeholderTextColor="#B0B0B0"
              value={bodyText}
              onChangeText={setBodyText}
              multiline
              textAlignVertical="top"
            />

            {/* Media Actions */}
            <View style={styles.mediaActions}>
              <TouchableOpacity style={styles.mediaButton}>
                <Ionicons name="image-outline" size={20} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.mediaButton}>
                <Ionicons name="gift-outline" size={20} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.mediaButton}>
                <Ionicons name="musical-notes-outline" size={20} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.mediaButton}>
                <Ionicons name="shield-outline" size={20} color="#666" />
              </TouchableOpacity>

              <View style={styles.spacer} />

              <TouchableOpacity style={styles.communityButton}>
                <Text style={styles.communityButtonText}>
                  {selectedCommunity || "Community"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Add Location */}
          <TouchableOpacity style={styles.optionCard}>
            <View style={styles.optionLeft}>
              <View style={styles.optionIconContainer}>
                <Ionicons name="location-outline" size={20} color="#666" />
              </View>
              <Text style={styles.optionText}>Add Location</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          {/* Share Post to Public */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => setIsPublic(!isPublic)}
          >
            <View style={styles.optionLeft}>
              <View style={styles.optionIconContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" />
              </View>
              <Text style={styles.optionText}>Share Post to Public</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          {/* Boost Post */}
          <TouchableOpacity style={styles.optionCard}>
            <View style={styles.optionLeft}>
              <View style={styles.optionIconContainer}>
                <Ionicons name="megaphone-outline" size={20} color="#666" />
              </View>
              <Text style={styles.optionText}>Boost Post</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.draftButton}
            onPress={handleSaveDraft}
          >
            <Text style={styles.draftButtonText}>Save as Draft</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.postButton,
              !title.trim() && styles.postButtonDisabled,
            ]}
            onPress={handlePost}
            disabled={!title.trim()}
          >
            <Text style={styles.postButtonText}>Post</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8EAF6",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#E8EAF6",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  inputCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  titleInput: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 12,
    paddingVertical: 8,
  },
  bodyInput: {
    fontSize: 14,
    color: "#666",
    minHeight: 100,
    paddingVertical: 8,
    marginBottom: 12,
  },
  mediaActions: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    gap: 12,
  },
  mediaButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  spacer: {
    flex: 1,
  },
  communityButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
  },
  communityButtonText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#000",
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#E8EAF6",
    gap: 12,
  },
  draftButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 28,
    backgroundColor: "#D1D5F0",
    alignItems: "center",
  },
  draftButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  postButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 28,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    shadowColor: "#7C3AED",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  postButtonDisabled: {
    backgroundColor: "#C5CAE9",
    shadowOpacity: 0,
    elevation: 0,
  },
  postButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
