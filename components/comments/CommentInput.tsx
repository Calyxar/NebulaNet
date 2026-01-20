// components/comments/CommentInput.tsx
import Avatar from "@/components/user/Avatar";
import { getCurrentUserProfile } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface CommentInputProps {
  onSubmit: (content: string) => void;
  placeholder?: string;
  replyTo?: {
    username: string;
    name: string;
  };
  onCancelReply?: () => void;
}

export default function CommentInput({
  onSubmit,
  placeholder = "Add a comment...",
  replyTo,
  onCancelReply,
}: CommentInputProps) {
  const [comment, setComment] = useState("");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    const profile = await getCurrentUserProfile();
    setUserProfile(profile);
  };

  const handleSubmit = async () => {
    if (!comment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(comment.trim());
      setComment("");
      if (onCancelReply) {
        onCancelReply();
      }
    } catch (error) {
      console.error("Error submitting comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelReply = () => {
    if (onCancelReply) {
      onCancelReply();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {replyTo && (
        <View style={styles.replyIndicator}>
          <Text style={styles.replyText}>Replying to {replyTo.name}</Text>
          <TouchableOpacity onPress={handleCancelReply}>
            <Ionicons name="close" size={16} color="#666" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputContainer}>
        {userProfile ? (
          <Avatar
            size={32}
            name={userProfile.full_name || userProfile.username}
            image={userProfile.avatar_url}
          />
        ) : (
          <View style={styles.placeholderAvatar} />
        )}

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={500}
            editable={!isSubmitting}
            onSubmitEditing={handleSubmit}
          />

          <TouchableOpacity
            style={[
              styles.submitButton,
              (!comment.trim() || isSubmitting) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!comment.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <Ionicons name="send" size={20} color="#999" />
            ) : (
              <Ionicons
                name="send"
                size={20}
                color={comment.trim() ? "#000" : "#999"}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.charCount}>{comment.length}/500</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    padding: 16,
  },
  replyIndicator: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  replyText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  placeholderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    marginRight: 12,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#f8f8f8",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#000",
    maxHeight: 100,
    paddingVertical: 4,
  },
  submitButton: {
    padding: 4,
    marginLeft: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  charCount: {
    fontSize: 11,
    color: "#999",
    textAlign: "right",
    marginTop: 4,
  },
});
