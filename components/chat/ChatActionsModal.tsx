import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface ActionItem {
  id: string;
  icon: string;
  label: string;
  color?: string;
  danger?: boolean;
  onPress: () => void;
}

interface ChatActionsModalProps {
  visible: boolean;
  onClose: () => void;
  actions: ActionItem[];
  title?: string;
}

export default function ChatActionsModal({
  visible,
  onClose,
  actions,
  title = 'Message Actions',
}: ChatActionsModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {actions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[
                  styles.actionItem,
                  action.danger && styles.dangerAction,
                ]}
                onPress={() => {
                  action.onPress();
                  onClose();
                }}
              >
                <Ionicons
                  name={action.icon as any}
                  size={22}
                  color={action.danger ? '#ff3b30' : action.color || '#007AFF'}
                />
                <Text
                  style={[
                    styles.actionLabel,
                    action.danger && styles.dangerLabel,
                  ]}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dangerAction: {
    borderBottomColor: '#ffe6e6',
  },
  actionLabel: {
    fontSize: 16,
    marginLeft: 16,
    color: '#333',
  },
  dangerLabel: {
    color: '#ff3b30',
  },
});