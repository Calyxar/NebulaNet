import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Keyboard,
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function ChatInput({
  onSendMessage,
  placeholder = 'Type a message...',
  disabled = false,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
      Keyboard.dismiss();
    }
  };

  const handleVoiceRecord = () => {
    setIsRecording(!isRecording);
    // Implement voice recording logic here
  };

  const handleAttachment = () => {
    // Implement attachment logic here
    console.log('Open attachment options');
  };

  const handleEmoji = () => {
    // Implement emoji picker logic here
    console.log('Open emoji picker');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.attachmentButton, disabled && styles.disabledButton]}
        onPress={handleAttachment}
        disabled={disabled}
      >
        <Ionicons name="add-circle-outline" size={28} color="#007AFF" />
      </TouchableOpacity>

      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={[styles.emojiButton, disabled && styles.disabledButton]}
          onPress={handleEmoji}
          disabled={disabled}
        >
          <Ionicons name="happy-outline" size={24} color="#666" />
        </TouchableOpacity>

        <TextInput
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
          editable={!disabled}
          onFocus={() => setIsRecording(false)}
        />

        {message.trim() ? (
          <TouchableOpacity
            style={[styles.sendButton, disabled && styles.disabledButton]}
            onPress={handleSend}
            disabled={disabled}
          >
            <Ionicons name="send" size={24} color="#007AFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.voiceButton, disabled && styles.disabledButton]}
            onPress={handleVoiceRecord}
            disabled={disabled}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
  },
  attachmentButton: {
    padding: 8,
    marginRight: 8,
    marginBottom: Platform.OS === 'ios' ? 8 : 4,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f5f5f5',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
    maxHeight: 100,
  },
  emojiButton: {
    padding: 4,
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 84,
    paddingHorizontal: 8,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
  },
  recordingInput: {
    backgroundColor: '#ffebee',
  },
  sendButton: {
    padding: 4,
    marginLeft: 4,
  },
  voiceButton: {
    padding: 4,
    marginLeft: 4,
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledInput: {
    opacity: 0.5,
  },
});