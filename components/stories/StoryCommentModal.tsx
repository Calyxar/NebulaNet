// components/stories/StoryCommentModal.tsx
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

interface StoryCommentModalProps {
  visible: boolean;
  onSendComment: (comment: string) => Promise<boolean> | undefined;
  onClose: () => void;
  placeholder?: string;
  showReactions?: boolean;
}

export default function StoryCommentModal({
  visible,
  onSendComment,
  onClose,
  placeholder = "Send a reply...",
  showReactions = true,
}: StoryCommentModalProps) {
  const [commentText, setCommentText] = useState("");
  const [isSending, setIsSending] = useState(false);

  if (!visible) return null;

  const handleSend = async () => {
    if (!commentText.trim() || isSending) return;

    setIsSending(true);
    try {
      const success = await onSendComment(commentText);
      if (success) {
        setCommentText("");
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickReaction = async (emoji: string) => {
    try {
      await onSendComment(emoji);
    } catch (error) {
      console.error("Error sending quick reaction:", error);
    }
  };

  const handleSubmit = () => {
    if (commentText.trim()) {
      handleSend();
    }
  };

  const quickReactions = ["❤️", "😂", "😮", "😢", "👏"];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.6)"
          value={commentText}
          onChangeText={setCommentText}
          multiline
          maxLength={200}
          autoFocus
          onSubmitEditing={handleSubmit}
          editable={!isSending}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!commentText.trim() || isSending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!commentText.trim() || isSending}
        >
          <Ionicons
            name="send"
            size={20}
            color={
              commentText.trim() && !isSending
                ? "#007AFF"
                : "rgba(255,255,255,0.3)"
            }
          />
        </TouchableOpacity>
      </View>

      {showReactions && (
        <View style={styles.reactionsContainer}>
          <Text style={styles.reactionsLabel}>Quick reactions:</Text>
          <View style={styles.reactionsRow}>
            {quickReactions.map((emoji, index) => (
              <TouchableOpacity
                key={index}
                style={styles.reactionButton}
                onPress={() => handleQuickReaction(emoji)}
                disabled={isSending}
              >
                <Text style={styles.reactionText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 40 : 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 4,
    maxHeight: 100,
  },
  sendButton: {
    padding: 8,
    marginLeft: 4,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  reactionsContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    paddingTop: 12,
  },
  reactionsLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginBottom: 8,
  },
  reactionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  reactionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    minWidth: 44,
    alignItems: "center",
  },
  reactionText: {
    fontSize: 20,
  },
});
