// components/stories/StoryCommentInput.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface StoryCommentInputProps {
  onSubmit: (content: string) => void;
  placeholder?: string;
}

export default function StoryCommentInput({
  onSubmit,
  placeholder = "Send a message...",
}: StoryCommentInputProps) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(message.trim());
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={200}
          editable={!isSubmitting}
          onSubmitEditing={handleSubmit}
          placeholderTextColor="#999"
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            (!message.trim() || isSubmitting) && styles.sendButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!message.trim() || isSubmitting}
        >
          <Ionicons
            name="send"
            size={20}
            color={message.trim() ? "#000" : "#999"}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#fff",
    maxHeight: 80,
    paddingVertical: 4,
  },
  sendButton: {
    padding: 4,
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
