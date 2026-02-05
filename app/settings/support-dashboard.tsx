// app/settings/support-dashboard.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    adminGetScreenshotSignedUrl,
    adminGetSupportReports,
    adminUpdateSupportReportStatus,
    type SupportReportRow,
} from "@/lib/queries/adminSupport";
import { getCurrentUserProfile } from "@/lib/supabase";

// ✅ Simple admin gating: set YOUR user id(s) here
const ADMIN_USER_IDS = new Set<string>([
  // "063ba9d2-228d-454f-b987-05e4fd2d8242", // example
]);

export default function SupportDashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [reports, setReports] = useState<SupportReportRow[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "resolved">(
    "open",
  );

  const [selected, setSelected] = useState<SupportReportRow | null>(null);

  // screenshot modal
  const [imgOpen, setImgOpen] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  // admin check
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      // ✅ Gate access here
      const me = await getCurrentUserProfile();
      const admin = !!me?.id && ADMIN_USER_IDS.has(me.id);
      setIsAdmin(admin);

      if (!admin) {
        setReports([]);
        return;
      }

      const data = await adminGetSupportReports();
      setReports(data);
    } catch (e: any) {
      console.error("Support dashboard load error:", e);
      Alert.alert("Error", e?.message || "Failed to load support reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return reports.filter((r) => {
      const status = (r.status || "open") as "open" | "resolved";

      if (statusFilter !== "all" && status !== statusFilter) return false;

      if (!q) return true;

      const name =
        r.profile?.full_name ||
        r.profile?.username ||
        (r.profile?.id ? r.profile.id.slice(0, 8) : "");

      const hay = [
        r.subject,
        r.details,
        r.platform,
        r.app_version,
        r.device_name,
        r.os_version,
        name,
        r.profile?.username ? "@" + r.profile.username : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [reports, query, statusFilter]);

  const openScreenshot = async (report: SupportReportRow) => {
    if (!report.screenshot_bucket || !report.screenshot_path) return;

    setImgOpen(true);
    setImgLoading(true);
    setImgUrl(null);

    try {
      const url = await adminGetScreenshotSignedUrl(
        report.screenshot_bucket,
        report.screenshot_path,
      );
      setImgUrl(url);
    } catch (e: any) {
      console.error("Signed url error:", e);
      Alert.alert("Error", e?.message || "Could not open screenshot.");
      setImgOpen(false);
    } finally {
      setImgLoading(false);
    }
  };

  const markResolved = async (report: SupportReportRow, resolved: boolean) => {
    try {
      await adminUpdateSupportReportStatus(
        report.id,
        resolved ? "resolved" : "open",
      );
      setReports((prev) =>
        prev.map((r) =>
          r.id === report.id
            ? { ...r, status: resolved ? "resolved" : "open" }
            : r,
        ),
      );
      if (selected?.id === report.id) {
        setSelected((s) =>
          s ? { ...s, status: resolved ? "resolved" : "open" } : s,
        );
      }
    } catch (e: any) {
      console.error("Update status error:", e);
      Alert.alert("Error", e?.message || "Failed to update report status.");
    }
  };

  const renderUser = (r: SupportReportRow) => {
    const displayName =
      r.profile?.full_name ||
      r.profile?.username ||
      (r.profile?.id ? r.profile.id.slice(0, 8) : "Unknown");

    const handle = r.profile?.username ? `@${r.profile.username}` : "";

    return { displayName, handle };
  };

  // ---------- UI ----------

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

          <Text style={styles.headerTitle}>Support Dashboard</Text>

          <TouchableOpacity
            style={styles.headerCircleButton}
            onPress={onRefresh}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color="#111827" />
          </TouchableOpacity>
        </View>

        {isAdmin === false ? (
          <View style={styles.deniedCard}>
            <Ionicons name="lock-closed" size={22} color="#111827" />
            <Text style={styles.deniedTitle}>Admin only</Text>
            <Text style={styles.deniedText}>
              This dashboard is restricted. If you’re staff, add your user ID to{" "}
              <Text style={styles.mono}>ADMIN_USER_IDS</Text>.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.toolbar}>
              <View style={styles.searchWrap}>
                <Ionicons name="search" size={18} color="#6B7280" />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search reports, user, device, version…"
                  placeholderTextColor="#9CA3AF"
                  style={styles.searchInput}
                  autoCapitalize="none"
                />
                {!!query && (
                  <TouchableOpacity
                    onPress={() => setQuery("")}
                    style={styles.iconBtn}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close" size={18} color="#6B7280" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.filtersRow}>
                {(["open", "resolved", "all"] as const).map((k) => {
                  const active = statusFilter === k;
                  return (
                    <TouchableOpacity
                      key={k}
                      onPress={() => setStatusFilter(k)}
                      style={[styles.pill, active && styles.pillActive]}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          active && styles.pillTextActive,
                        ]}
                      >
                        {k === "all"
                          ? "All"
                          : k === "open"
                            ? "Open"
                            : "Resolved"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator />
                <Text style={styles.loadingText}>Loading reports…</Text>
              </View>
            ) : (
              <ScrollView
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                  />
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                <Text style={styles.countText}>
                  Showing {filtered.length} report
                  {filtered.length === 1 ? "" : "s"}
                </Text>

                {filtered.map((r) => {
                  const { displayName, handle } = renderUser(r);
                  const status = (r.status || "open") as "open" | "resolved";
                  const hasShot = !!r.screenshot_bucket && !!r.screenshot_path;

                  return (
                    <TouchableOpacity
                      key={r.id}
                      style={styles.reportCard}
                      onPress={() => setSelected(r)}
                      activeOpacity={0.9}
                    >
                      <View style={styles.reportTopRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.reportSubject} numberOfLines={1}>
                            {r.subject || "No subject"}
                          </Text>
                          <Text style={styles.reportMeta} numberOfLines={1}>
                            {displayName}
                            {handle ? ` • ${handle}` : ""} •{" "}
                            {r.platform || "unknown"} • v{r.app_version || "?"}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.statusBadge,
                            status === "resolved" && styles.statusResolved,
                          ]}
                        >
                          <Text style={styles.statusText}>
                            {status === "resolved" ? "Resolved" : "Open"}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.reportDetails} numberOfLines={2}>
                        {r.details || "No details"}
                      </Text>

                      <View style={styles.reportBottomRow}>
                        <Text style={styles.smallMuted}>
                          {r.created_at
                            ? new Date(r.created_at).toLocaleString()
                            : ""}
                        </Text>

                        {hasShot && (
                          <View style={styles.hasShot}>
                            <Ionicons name="image" size={14} color="#111827" />
                            <Text style={styles.hasShotText}>Screenshot</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {filtered.length === 0 && (
                  <View style={styles.emptyState}>
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={26}
                      color="#6B7280"
                    />
                    <Text style={styles.emptyTitle}>No reports found</Text>
                    <Text style={styles.emptyText}>
                      Try a different search or filter.
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </>
        )}

        {/* Details Modal */}
        <Modal visible={!!selected} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Report Details</Text>
                <TouchableOpacity
                  onPress={() => setSelected(null)}
                  style={styles.iconBtn}
                  activeOpacity={0.85}
                >
                  <Ionicons name="close" size={22} color="#111827" />
                </TouchableOpacity>
              </View>

              {selected && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {(() => {
                    const { displayName, handle } = renderUser(selected);
                    const status = (selected.status || "open") as
                      | "open"
                      | "resolved";
                    const hasShot =
                      !!selected.screenshot_bucket &&
                      !!selected.screenshot_path;

                    return (
                      <>
                        <Text style={styles.modalSubject}>
                          {selected.subject || "No subject"}
                        </Text>

                        <Text style={styles.modalMeta}>
                          {displayName}
                          {handle ? ` • ${handle}` : ""} {" • "}
                          {selected.platform || "unknown"} {" • "}v
                          {selected.app_version || "?"}
                        </Text>

                        <View style={styles.modalActionsRow}>
                          <TouchableOpacity
                            style={[
                              styles.actionBtn,
                              status === "resolved"
                                ? styles.actionBtnGhost
                                : styles.actionBtnPrimary,
                            ]}
                            activeOpacity={0.85}
                            onPress={() =>
                              markResolved(selected, status !== "resolved")
                            }
                          >
                            <Ionicons
                              name={
                                status === "resolved" ? "refresh" : "checkmark"
                              }
                              size={18}
                              color={
                                status === "resolved" ? "#111827" : "#FFFFFF"
                              }
                            />
                            <Text
                              style={[
                                styles.actionBtnText,
                                status === "resolved"
                                  ? styles.actionBtnTextDark
                                  : styles.actionBtnTextLight,
                              ]}
                            >
                              {status === "resolved"
                                ? "Reopen"
                                : "Mark resolved"}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnGhost]}
                            activeOpacity={0.85}
                            onPress={() => {
                              if (!hasShot) return;
                              openScreenshot(selected);
                            }}
                            disabled={!hasShot}
                          >
                            <Ionicons name="image" size={18} color="#111827" />
                            <Text
                              style={[
                                styles.actionBtnText,
                                styles.actionBtnTextDark,
                              ]}
                            >
                              {hasShot ? "View screenshot" : "No screenshot"}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        <View style={styles.detailBlock}>
                          <Text style={styles.detailLabel}>Details</Text>
                          <Text style={styles.detailText}>
                            {selected.details || "No details"}
                          </Text>
                        </View>

                        <View style={styles.detailGrid}>
                          <View style={styles.detailChip}>
                            <Text style={styles.detailChipLabel}>Device</Text>
                            <Text style={styles.detailChipValue}>
                              {selected.device_name || "Unknown"}
                            </Text>
                          </View>

                          <View style={styles.detailChip}>
                            <Text style={styles.detailChipLabel}>OS</Text>
                            <Text style={styles.detailChipValue}>
                              {selected.os_version || "Unknown"}
                            </Text>
                          </View>

                          <View style={styles.detailChip}>
                            <Text style={styles.detailChipLabel}>Created</Text>
                            <Text style={styles.detailChipValue}>
                              {selected.created_at
                                ? new Date(selected.created_at).toLocaleString()
                                : ""}
                            </Text>
                          </View>

                          <View style={styles.detailChip}>
                            <Text style={styles.detailChipLabel}>Status</Text>
                            <Text style={styles.detailChipValue}>
                              {(selected.status || "open").toUpperCase()}
                            </Text>
                          </View>
                        </View>
                      </>
                    );
                  })()}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* Screenshot Modal */}
        <Modal visible={imgOpen} animationType="fade" transparent>
          <View style={styles.imgBackdrop}>
            <View style={styles.imgHeader}>
              <TouchableOpacity
                onPress={() => {
                  setImgOpen(false);
                  setImgUrl(null);
                }}
                style={styles.imgClose}
                activeOpacity={0.85}
              >
                <Ionicons name="close" size={26} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.imgBody}>
              {imgLoading ? (
                <View style={styles.imgLoading}>
                  <ActivityIndicator />
                  <Text style={styles.imgLoadingText}>Loading screenshot…</Text>
                </View>
              ) : imgUrl ? (
                <Image
                  source={{ uri: imgUrl }}
                  style={styles.img}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.imgLoading}>
                  <Text style={styles.imgLoadingText}>No image</Text>
                </View>
              )}
            </View>
          </View>
        </Modal>
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

  toolbar: {
    paddingHorizontal: 18,
    paddingBottom: 10,
  },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E6E9FF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 14,
    color: "#111827",
  },
  iconBtn: {
    padding: 8,
    borderRadius: 10,
  },

  filtersRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 10,
  },
  pill: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E9FF",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  pillActive: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },
  pillText: { color: "#111827", fontWeight: "700", fontSize: 12 },
  pillTextActive: { color: "#FFFFFF" },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 60,
    gap: 10,
  },
  loadingText: { color: "#111827", fontWeight: "600" },

  scrollContent: { paddingHorizontal: 18, paddingBottom: 28 },
  countText: { marginTop: 8, marginBottom: 12, color: "#6B7280", fontSize: 12 },

  reportCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EEF2FF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  reportTopRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  reportSubject: { fontSize: 15, fontWeight: "800", color: "#111827" },
  reportMeta: { marginTop: 4, fontSize: 12, color: "#6B7280" },
  reportDetails: { marginTop: 10, color: "#111827", lineHeight: 19 },

  reportBottomRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  smallMuted: { fontSize: 11, color: "#6B7280" },
  hasShot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EEF2FF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  hasShotText: { fontSize: 12, fontWeight: "700", color: "#111827" },

  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#EEF2FF",
  },
  statusResolved: {
    backgroundColor: "#D1FAE5",
  },
  statusText: { fontSize: 12, fontWeight: "800", color: "#111827" },

  emptyState: {
    marginTop: 30,
    padding: 18,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: { fontWeight: "800", color: "#111827" },
  emptyText: { color: "#6B7280", textAlign: "center" },

  deniedCard: {
    marginTop: 18,
    marginHorizontal: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEF2FF",
    gap: 10,
  },
  deniedTitle: { fontWeight: "900", color: "#111827", fontSize: 14 },
  deniedText: { color: "#6B7280", lineHeight: 18 },
  mono: { fontFamily: "monospace", color: "#111827" },

  // Details modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.35)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    maxHeight: "88%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 8,
  },
  modalTitle: { fontSize: 14, fontWeight: "900", color: "#111827" },
  modalSubject: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    marginTop: 6,
  },
  modalMeta: { color: "#6B7280", marginTop: 6, lineHeight: 18 },

  modalActionsRow: { flexDirection: "row", gap: 10, marginTop: 14 },

  actionBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  actionBtnPrimary: { backgroundColor: "#7C3AED" },
  actionBtnGhost: { backgroundColor: "#EEF2FF" },
  actionBtnText: { fontWeight: "900", fontSize: 13 },
  actionBtnTextLight: { color: "#FFFFFF" },
  actionBtnTextDark: { color: "#111827" },

  detailBlock: {
    marginTop: 14,
    backgroundColor: "#F8FAFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E6E9FF",
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 6,
  },
  detailText: { color: "#111827", lineHeight: 19 },

  detailGrid: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  detailChip: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEF2FF",
    borderRadius: 16,
    padding: 12,
  },
  detailChipLabel: { fontSize: 11, color: "#6B7280", fontWeight: "800" },
  detailChipValue: { marginTop: 6, color: "#111827", fontWeight: "800" },

  // Screenshot modal
  imgBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)" },
  imgHeader: {
    paddingTop: 50,
    paddingHorizontal: 16,
    alignItems: "flex-end",
  },
  imgClose: { padding: 10 },
  imgBody: { flex: 1, alignItems: "center", justifyContent: "center" },
  imgLoading: { alignItems: "center", gap: 10 },
  imgLoadingText: { color: "#FFFFFF", fontWeight: "700" },
  img: { width: "92%", height: "80%" },
});
