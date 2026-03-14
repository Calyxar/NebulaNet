// components/comments/CommentInput.tsx — FIREBASE ✅ + dark mode
import Avatar from "@/components/user/Avatar";
import { auth, db } from "@/lib/firebase";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { doc, getDoc } from "firebase/firestore";
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
  replyTo?: { username: string; name: string };
  onCancelReply?: () => void;
}

async function getCurrentUserProfile() {
  const user = auth.currentUser;
  if (!user) return null;
  const snap = await getDoc(doc(db, "profiles", user.uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as any;
}

export default function CommentInput({
  onSubmit,
  placeholder = "Add a comment...",
  replyTo,
  onCancelReply,
}: CommentInputProps) {
  const { colors } = useTheme();
  const [comment, setComment] = useState("");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    getCurrentUserProfile().then(setUserProfile);
  }, []);

  const handleSubmit = async () => {
    if (!comment.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit(comment.trim());
      setComment("");
      onCancelReply?.();
    } catch (error) {
      console.error("Error submitting comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[
        styles.container,
        { backgroundColor: colors.card, borderTopColor: colors.border },
      ]}
    >
      {replyTo && (
        <View
          style={[styles.replyIndicator, { backgroundColor: colors.surface }]}
        >
          <Text style={[styles.replyText, { color: colors.textSecondary }]}>
            Replying to {replyTo.name}
          </Text>
          <TouchableOpacity onPress={onCancelReply}>
            <Ionicons name="close" size={16} color={colors.textSecondary} />
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
          <View
            style={[
              styles.placeholderAvatar,
              { backgroundColor: colors.surface },
            ]}
          />
        )}

        <View
          style={[styles.inputWrapper, { backgroundColor: colors.surface }]}
        >
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder={placeholder}
            placeholderTextColor={colors.textTertiary}
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
            <Ionicons
              name="send"
              size={20}
              color={
                comment.trim() && !isSubmitting
                  ? colors.primary
                  : colors.textTertiary
              }
            />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.charCount, { color: colors.textTertiary }]}>
        {comment.length}/500
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    padding: 16,
  },
  replyIndicator: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  replyText: { fontSize: 12, fontWeight: "500" },
  inputContainer: { flexDirection: "row", alignItems: "flex-start" },
  placeholderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    maxHeight: 100,
    paddingVertical: 4,
  },
  submitButton: { padding: 4, marginLeft: 8 },
  submitButtonDisabled: { opacity: 0.5 },
  charCount: { fontSize: 11, textAlign: "right", marginTop: 4 },
});
