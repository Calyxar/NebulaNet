// components/community/ReportModal.tsx

import { useAuth } from "@/hooks/useAuth";
import { createCommunityReport } from "@/lib/firestore/communityReports";
import { useTheme } from "@/providers/ThemeProvider";
import React, { useState } from "react";
import {
    Alert,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;

  communityId: string;

  type: "post" | "comment" | "user";

  reportedId: string;
};

export default function ReportModal({
  visible,
  onClose,
  communityId,
  type,
  reportedId,
}: Props) {
  const { user } = useAuth();
  const { colors } = useTheme();

  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const submitReport = async () => {
    if (!user?.uid) return;

    if (!reason.trim()) {
      Alert.alert(
        "Reason required",
        "Please explain why you are reporting this.",
      );
      return;
    }

    try {
      setLoading(true);

      await createCommunityReport(
        communityId,
        user.uid,
        type,
        reportedId,
        reason.trim(),
      );

      Alert.alert("Report submitted", "Thanks. A moderator will review it.");

      setReason("");
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to submit report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: colors.card,
            },
          ]}
        >
          <Text
            style={[
              styles.title,
              {
                color: colors.text,
              },
            ]}
          >
            Report {type}
          </Text>

          <TextInput
            value={reason}
            onChangeText={setReason}
            multiline
            placeholder="Why are you reporting this?"
            placeholderTextColor={colors.textTertiary}
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]}
          />

          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: colors.textTertiary }}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={submitReport} disabled={loading}>
              <Text
                style={{
                  color: colors.primary,
                  fontWeight: "800",
                }}
              >
                {loading ? "Sending..." : "Report"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 20,
  },

  container: {
    borderRadius: 20,
    padding: 20,
  },

  title: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 15,
  },

  input: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    textAlignVertical: "top",
  },

  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 25,
    marginTop: 20,
  },
});
