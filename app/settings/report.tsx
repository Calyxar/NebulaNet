// app/settings/report.tsx  ✅ COMPLETED + UPDATED (Supabase report + optional screenshot upload)
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SUPPORT_BUCKET = "support-screenshots";

async function submitSupportReport(params: {
  subject: string;
  details: string;
  screenshotUri?: string | null;
}) {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const user = auth.user;
  if (!user) throw new Error("Not authenticated");

  const appVersion =
    Constants.expoConfig?.version ??
    (Constants as any)?.manifest?.version ??
    null;

  // 1) create report row first
  const { data: created, error: createError } = await supabase
    .from("support_reports")
    .insert({
      user_id: user.id,
      subject: params.subject.trim(),
      details: params.details.trim(),
      app_version: appVersion,
      platform: Platform.OS,
      device_name: Device.deviceName ?? null,
      os_version: Device.osVersion ?? null,
      screenshot_bucket: null,
      screenshot_path: null,
    })
    .select("id")
    .single();

  if (createError) throw createError;
  if (!created?.id) throw new Error("Failed to create report");

  // 2) optional screenshot upload (PRIVATE bucket)
  if (params.screenshotUri) {
    const reportId = created.id as string;
    const path = `${user.id}/support/${reportId}.jpg`;

    const resp = await fetch(params.screenshotUri);
    const blob = await resp.blob();

    const { error: uploadError } = await supabase.storage
      .from(SUPPORT_BUCKET)
      .upload(path, blob, {
        upsert: true,
        contentType: "image/jpeg",
      });

    if (uploadError) throw uploadError;

    const { error: updateError } = await supabase
      .from("support_reports")
      .update({
        screenshot_bucket: SUPPORT_BUCKET,
        screenshot_path: path,
      })
      .eq("id", reportId);

    if (updateError) throw updateError;
  }

  return created;
}

export default function ReportProblemScreen() {
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
      // NOTE: MediaTypeOptions is deprecated in newer SDKs; if you want,
      // we'll swap to ImagePicker.MediaType.Images when we do your SDK cleanup.
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });

    if (!result.canceled) {
      setScreenshotUri(result.assets[0].uri);
    }
  };

  const removeScreenshot = () => setScreenshotUri(null);

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
        "Thanks — your report was submitted. We’ll review it soon.",
      );

      setSubject("");
      setDetails("");
      setScreenshotUri(null);
      router.back();
    } catch (e: any) {
      console.error("❌ Support report submit error:", e);
      Alert.alert(
        "Couldn’t send",
        e?.message || "Something went wrong submitting your report.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LinearGradient
      colors={["#DCEBFF", "#EEF4FF", "#FFFFFF"]}
      locations={[0, 0.45, 1]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerCircleButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Report a Problem</Text>

          <View style={styles.headerCircleButton} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.card}>
            <Text style={styles.label}>Subject</Text>
            <TextInput
              value={subject}
              onChangeText={setSubject}
              placeholder="What happened?"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              editable={!isSubmitting}
            />

            <Text style={[styles.label, { marginTop: 14 }]}>Details</Text>
            <TextInput
              value={details}
              onChangeText={setDetails}
              placeholder="Steps to reproduce, what you expected, what you saw…"
              placeholderTextColor="#9CA3AF"
              style={[styles.input, styles.textArea]}
              multiline
              editable={!isSubmitting}
            />

            {/* Screenshot */}
            <View style={styles.screenshotSection}>
              <View style={styles.screenshotHeader}>
                <Text style={styles.label}>Screenshot (optional)</Text>
                {screenshotUri ? (
                  <TouchableOpacity
                    onPress={removeScreenshot}
                    activeOpacity={0.85}
                    disabled={isSubmitting}
                    style={styles.removeChip}
                  >
                    <Ionicons name="trash-outline" size={16} color="#111827" />
                    <Text style={styles.removeChipText}>Remove</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {screenshotUri ? (
                <Image source={{ uri: screenshotUri }} style={styles.preview} />
              ) : (
                <View style={styles.previewPlaceholder}>
                  <Ionicons name="image-outline" size={22} color="#6B7280" />
                  <Text style={styles.previewPlaceholderText}>
                    No screenshot attached
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={pickScreenshot}
                activeOpacity={0.85}
                disabled={isSubmitting}
              >
                <Ionicons
                  name="attach-outline"
                  size={18}
                  color="#111827"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.secondaryButtonText}>
                  {screenshotUri ? "Change Screenshot" : "Attach Screenshot"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tipBox}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color="#111827"
              />
              <Text style={styles.tipText}>
                Tip: include your device + OS version for faster fixes. (We add
                it automatically.)
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                isSubmitting && styles.primaryButtonDisabled,
              ]}
              onPress={submit}
              activeOpacity={0.85}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator />
                  <Text style={styles.primaryButtonText}>Sending…</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>Submit</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.helperText}>
              You can also email:{" "}
              <Text style={styles.linkText}>support@nebulanet.space</Text>
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, backgroundColor: "transparent" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 10,
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  headerCircleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },

  scrollContent: { paddingHorizontal: 18, paddingBottom: 28 },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },

  label: { fontSize: 13, fontWeight: "700", color: "#111827", marginBottom: 8 },

  input: {
    backgroundColor: "#F8FAFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E6E9FF",
    fontSize: 15,
    color: "#111827",
  },
  textArea: { minHeight: 120, textAlignVertical: "top" },

  screenshotSection: { marginTop: 14 },
  screenshotHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  preview: {
    width: "100%",
    height: 200,
    borderRadius: 14,
    marginTop: 10,
    backgroundColor: "#F3F4F6",
  },
  previewPlaceholder: {
    marginTop: 10,
    height: 120,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E6E9FF",
    backgroundColor: "#F8FAFF",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  previewPlaceholderText: { color: "#6B7280", fontSize: 12, fontWeight: "600" },

  removeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#EEF2FF",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E6E9FF",
  },
  removeChipText: { color: "#111827", fontSize: 12, fontWeight: "700" },

  secondaryButton: {
    marginTop: 12,
    backgroundColor: "#EEF2FF",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#E6E9FF",
  },
  secondaryButtonText: { color: "#111827", fontWeight: "700", fontSize: 14 },

  tipBox: {
    marginTop: 14,
    backgroundColor: "#EEF2FF",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  tipText: { flex: 1, color: "#111827", fontSize: 13, lineHeight: 18 },

  primaryButton: {
    marginTop: 16,
    backgroundColor: "#7C3AED",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonDisabled: { opacity: 0.8 },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },

  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },

  helperText: {
    marginTop: 12,
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
  },
  linkText: { color: "#7C3AED", fontWeight: "700" },
});
