// components/ForceUpdateModal.tsx ✅
// Blocking modal shown when app version is below min_version in Firestore.
// Cannot be dismissed — user must update via Play Store.

import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import React from "react";
import {
  Modal, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";

interface Props {
  visible: boolean;
  storeUrl: string;
}

export default function ForceUpdateModal({ visible, storeUrl }: Props) {
  const { colors, isDark } = useTheme();

  const handleUpdate = () => {
    Linking.openURL(storeUrl).catch(() => {});
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      // No onRequestClose — intentionally blocking
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {/* Icon */}
          <LinearGradient
            colors={["#7C3AED", "#EC4899"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconWrap}
          >
            <Ionicons name="rocket-outline" size={36} color="#fff" />
          </LinearGradient>

          {/* Text */}
          <Text style={[styles.title, { color: colors.text }]}>
            Update required
          </Text>
          <Text style={[styles.body, { color: colors.textTertiary }]}>
            A new version of NebulaNet is available with important improvements and fixes. Please update to continue.
          </Text>

          {/* Update button */}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={handleUpdate}
            activeOpacity={0.88}
          >
            <Ionicons name="download-outline" size={18} color="#fff" />
            <Text style={styles.btnText}>Update Now</Text>
          </TouchableOpacity>

          {/* Version note */}
          <Text style={[styles.note, { color: colors.textTertiary }]}>
            Available on Google Play
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  card: {
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    width: "100%",
    maxWidth: 360,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 10,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 12,
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 28,
    fontWeight: "400",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 999,
    marginBottom: 14,
    width: "100%",
    justifyContent: "center",
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  note: {
    fontSize: 12,
    fontWeight: "500",
  },
});
