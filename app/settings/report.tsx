// app/settings/report.tsx — UPDATED ✅ dark mode
import { auth, db } from "@/lib/firebase";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { getStorage, ref as storageRef, uploadBytes } from "firebase/storage";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

async function submitSupportReport(params: {
  subject: string;
  details: string;
  screenshotUri?: string | null;
}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const appVersion =
    Constants.expoConfig?.version ??
    (Constants as any)?.manifest?.version ??
    null;
  const reportRef = await addDoc(collection(db, "support_reports"), {
    user_id: user.uid,
    subject: params.subject.trim(),
    details: params.details.trim(),
    app_version: appVersion,
    platform: Platform.OS,
    device_name: Device.deviceName ?? null,
    os_version: Device.osVersion ?? null,
    screenshot_path: null,
    created_at: serverTimestamp(),
  });
  if (params.screenshotUri) {
    const path = `${user.uid}/support/${reportRef.id}.jpg`;
    const resp = await fetch(params.screenshotUri);
    const blob = await resp.blob();
    const storage = getStorage();
    await uploadBytes(storageRef(storage, path), blob, {
      contentType: "image/jpeg",
    });
    await updateDoc(doc(db, "support_reports", reportRef.id), {
      screenshot_path: path,
    });
  }
  return { id: reportRef.id };
}

export default function ReportProblemScreen() {
  const { colors, isDark } = useTheme();
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickScreenshot = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Permission needed",
        "Allow photo access to attach a screenshot.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!result.canceled) setScreenshotUri(result.assets[0].uri);
  };

  const submit = async () => {
    if (!subject.trim() || !details.trim()) {
      Alert.alert("Missing info", "Please add a subject and details.");
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await submitSupportReport({ subject, details, screenshotUri });
      Alert.alert(
        "Sent",
        "Thanks — your report was submitted. We'll review it soon.",
      );
      setSubject("");
      setDetails("");
      setScreenshotUri(null);
      router.back();
    } catch (e: any) {
      Alert.alert("Couldn't send", e?.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "transparent" }}
      edges={["left", "right"]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      <View style={styles.header}>
        <TouchableOpacity
          style={[
            styles.circleBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Report a Problem
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.text }]}>Subject</Text>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="What happened?"
            placeholderTextColor={colors.textTertiary}
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            editable={!isSubmitting}
          />

          <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>
            Details
          </Text>
          <TextInput
            value={details}
            onChangeText={setDetails}
            placeholder="Steps to reproduce, what you expected, what you saw…"
            placeholderTextColor={colors.textTertiary}
            style={[
              styles.input,
              styles.textArea,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            multiline
            editable={!isSubmitting}
          />

          {/* Screenshot */}
          <View style={styles.screenshotSection}>
            <View style={styles.screenshotHeader}>
              <Text style={[styles.label, { color: colors.text }]}>
                Screenshot (optional)
              </Text>
              {screenshotUri && (
                <TouchableOpacity
                  onPress={() => setScreenshotUri(null)}
                  activeOpacity={0.85}
                  disabled={isSubmitting}
                  style={[
                    styles.removeChip,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color={colors.text}
                  />
                  <Text style={[styles.removeChipText, { color: colors.text }]}>
                    Remove
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {screenshotUri ? (
              <Image source={{ uri: screenshotUri }} style={styles.preview} />
            ) : (
              <View
                style={[
                  styles.previewPlaceholder,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="image-outline"
                  size={22}
                  color={colors.textSecondary}
                />
                <Text
                  style={[
                    styles.previewPlaceholderText,
                    { color: colors.textSecondary },
                  ]}
                >
                  No screenshot attached
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.secondaryBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={pickScreenshot}
              activeOpacity={0.85}
              disabled={isSubmitting}
            >
              <Ionicons
                name="attach-outline"
                size={18}
                color={colors.text}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
                {screenshotUri ? "Change Screenshot" : "Attach Screenshot"}
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.tipBox,
              {
                backgroundColor: colors.primary + "12",
                borderColor: colors.primary + "25",
              },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={colors.primary}
            />
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              Tip: include your device + OS version for faster fixes. (We add it
              automatically.)
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.primaryBtn,
              { backgroundColor: colors.primary },
              isSubmitting && { opacity: 0.8 },
            ]}
            onPress={submit}
            activeOpacity={0.85}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.primaryBtnText}>Sending…</Text>
              </View>
            ) : (
              <Text style={styles.primaryBtnText}>Submit</Text>
            )}
          </TouchableOpacity>

          <Text style={[styles.helperText, { color: colors.textSecondary }]}>
            You can also email:{" "}
            <Text style={[styles.linkText, { color: colors.primary }]}>
              support@nebulanet.space
            </Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  if (!isDark) {
    return (
      <LinearGradient
        colors={["#DCEBFF", "#EEF4FF", "#FFFFFF"]}
        locations={[0, 0.45, 1]}
        style={{ flex: 1 }}
      >
        {content}
      </LinearGradient>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 10,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: { fontSize: 16, fontWeight: "700" },
  scroll: { paddingHorizontal: 18, paddingBottom: 28 },
  card: {
    borderRadius: 22,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  label: { fontSize: 13, fontWeight: "700", marginBottom: 8 },
  input: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    fontSize: 15,
  },
  textArea: { minHeight: 120, textAlignVertical: "top" },
  screenshotSection: { marginTop: 14 },
  screenshotHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  preview: { width: "100%", height: 200, borderRadius: 14, marginTop: 10 },
  previewPlaceholder: {
    marginTop: 10,
    height: 120,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  previewPlaceholderText: { fontSize: 12, fontWeight: "600" },
  removeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  removeChipText: { fontSize: 12, fontWeight: "700" },
  secondaryBtn: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    borderWidth: 1,
  },
  secondaryBtnText: { fontWeight: "700", fontSize: 14 },
  tipBox: {
    marginTop: 14,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    borderWidth: 1,
  },
  tipText: { flex: 1, fontSize: 13, lineHeight: 18 },
  primaryBtn: {
    marginTop: 16,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  helperText: {
    marginTop: 12,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  linkText: { fontWeight: "700" },
});
