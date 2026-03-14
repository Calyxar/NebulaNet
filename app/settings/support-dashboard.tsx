// app/settings/support-dashboard.tsx — UPDATED ✅ dark mode
import { auth, db } from "@/lib/firebase";
import {
  adminGetScreenshotUrl,
  adminGetSupportReports,
  adminUpdateSupportReportStatus,
  type SupportReportRow,
} from "@/lib/queries/adminSupport";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ProfileAdminFlag = {
  id: string;
  role?: string | null;
  is_suspended?: boolean | null;
};

async function getMyProfile(): Promise<ProfileAdminFlag | null> {
  const u = auth.currentUser;
  if (!u) return null;
  const snap = await getDoc(doc(db, "profiles", u.uid));
  if (!snap.exists()) return { id: u.uid };
  const d = snap.data() as any;
  return {
    id: snap.id,
    role: d.role ?? null,
    is_suspended: d.is_suspended ?? null,
  };
}

export default function SupportDashboardScreen() {
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState<SupportReportRow[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "resolved">(
    "open",
  );
  const [selected, setSelected] = useState<SupportReportRow | null>(null);
  const [imgOpen, setImgOpen] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const me = await getMyProfile();
      const admin = me?.role === "admin";
      setIsAdmin(admin);
      if (!admin) {
        setReports([]);
        return;
      }
      const data = await adminGetSupportReports({ pageSize: 50 });
      setReports(data);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to load support reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await load();
      } finally {
        if (!alive) return;
      }
    })();
    return () => {
      alive = false;
    };
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
      const url = await adminGetScreenshotUrl(report.screenshot_path);
      if (!url) throw new Error("Screenshot URL is null");
      setImgUrl(url);
    } catch (e: any) {
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
      if (selected?.id === report.id)
        setSelected((s) =>
          s ? { ...s, status: resolved ? "resolved" : "open" } : s,
        );
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to update status.");
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
          Support Dashboard
        </Text>
        <TouchableOpacity
          style={[
            styles.circleBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={onRefresh}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {isAdmin === false ? (
        <View
          style={[
            styles.deniedCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons name="lock-closed" size={22} color={colors.text} />
          <Text style={[styles.deniedTitle, { color: colors.text }]}>
            Admin only
          </Text>
          <Text style={[styles.deniedText, { color: colors.textSecondary }]}>
            This dashboard is restricted.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.toolbar}>
            <View
              style={[
                styles.searchWrap,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Ionicons name="search" size={18} color={colors.textSecondary} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search reports, user, device…"
                placeholderTextColor={colors.textTertiary}
                style={[styles.searchInput, { color: colors.text }]}
                autoCapitalize="none"
              />
              {!!query && (
                <TouchableOpacity
                  onPress={() => setQuery("")}
                  style={styles.iconBtn}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="close"
                    size={18}
                    color={colors.textSecondary}
                  />
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
                    style={[
                      styles.pill,
                      {
                        backgroundColor: active ? colors.primary : colors.card,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        { color: active ? "#fff" : colors.text },
                      ]}
                    >
                      {k === "all" ? "All" : k === "open" ? "Open" : "Resolved"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.text }]}>
                Loading reports…
              </Text>
            </View>
          ) : (
            <ScrollView
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scroll}
            >
              <Text style={[styles.countText, { color: colors.textSecondary }]}>
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
                    style={[
                      styles.reportCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => setSelected(r)}
                    activeOpacity={0.9}
                  >
                    <View style={styles.reportTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[styles.reportSubject, { color: colors.text }]}
                          numberOfLines={1}
                        >
                          {r.subject || "No subject"}
                        </Text>
                        <Text
                          style={[
                            styles.reportMeta,
                            { color: colors.textSecondary },
                          ]}
                          numberOfLines={1}
                        >
                          {displayName}
                          {handle ? ` • ${handle}` : ""} •{" "}
                          {r.platform || "unknown"} • v{r.app_version || "?"}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              status === "resolved"
                                ? "#D1FAE5"
                                : colors.primary + "18",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            {
                              color:
                                status === "resolved"
                                  ? "#065F46"
                                  : colors.primary,
                            },
                          ]}
                        >
                          {status === "resolved" ? "Resolved" : "Open"}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.reportDetails,
                        { color: colors.textSecondary },
                      ]}
                      numberOfLines={2}
                    >
                      {r.details || "No details"}
                    </Text>
                    <View style={styles.reportBottom}>
                      <Text
                        style={[
                          styles.smallMuted,
                          { color: colors.textTertiary },
                        ]}
                      >
                        {r.created_at
                          ? new Date(r.created_at).toLocaleString()
                          : ""}
                      </Text>
                      {hasShot && (
                        <View
                          style={[
                            styles.hasShot,
                            { backgroundColor: colors.surface },
                          ]}
                        >
                          <Ionicons
                            name="image"
                            size={14}
                            color={colors.text}
                          />
                          <Text
                            style={[styles.hasShotText, { color: colors.text }]}
                          >
                            Screenshot
                          </Text>
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
                    color={colors.textSecondary}
                  />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>
                    No reports found
                  </Text>
                  <Text
                    style={[styles.emptyText, { color: colors.textSecondary }]}
                  >
                    Try a different search or filter.
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </>
      )}

      {/* Details modal — always light sheet for readability */}
      <Modal visible={!!selected} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Report Details
              </Text>
              <TouchableOpacity
                onPress={() => setSelected(null)}
                style={styles.iconBtn}
                activeOpacity={0.85}
              >
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            {selected &&
              (() => {
                const { displayName, handle } = renderUser(selected);
                const status = (selected.status || "open") as
                  | "open"
                  | "resolved";
                const hasShot =
                  !!selected.screenshot_bucket && !!selected.screenshot_path;
                return (
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={[styles.modalSubject, { color: colors.text }]}>
                      {selected.subject || "No subject"}
                    </Text>
                    <Text
                      style={[
                        styles.modalMeta,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {displayName}
                      {handle ? ` • ${handle}` : ""} •{" "}
                      {selected.platform || "unknown"} • v
                      {selected.app_version || "?"}
                    </Text>
                    <View style={styles.modalActionsRow}>
                      <TouchableOpacity
                        style={[
                          styles.actionBtn,
                          {
                            backgroundColor:
                              status === "resolved"
                                ? colors.surface
                                : colors.primary,
                          },
                        ]}
                        activeOpacity={0.85}
                        onPress={() =>
                          markResolved(selected, status !== "resolved")
                        }
                      >
                        <Ionicons
                          name={status === "resolved" ? "refresh" : "checkmark"}
                          size={18}
                          color={status === "resolved" ? colors.text : "#fff"}
                        />
                        <Text
                          style={[
                            styles.actionBtnText,
                            {
                              color:
                                status === "resolved" ? colors.text : "#fff",
                            },
                          ]}
                        >
                          {status === "resolved" ? "Reopen" : "Mark resolved"}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.actionBtn,
                          { backgroundColor: colors.surface },
                        ]}
                        activeOpacity={0.85}
                        onPress={() => {
                          if (!hasShot) return;
                          openScreenshot(selected);
                        }}
                        disabled={!hasShot}
                      >
                        <Ionicons name="image" size={18} color={colors.text} />
                        <Text
                          style={[styles.actionBtnText, { color: colors.text }]}
                        >
                          {hasShot ? "View screenshot" : "No screenshot"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View
                      style={[
                        styles.detailBlock,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.detailLabel, { color: colors.text }]}
                      >
                        Details
                      </Text>
                      <Text
                        style={[
                          styles.detailText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {selected.details || "No details"}
                      </Text>
                    </View>
                    <View style={styles.detailGrid}>
                      {[
                        ["Device", selected.device_name],
                        ["OS", selected.os_version],
                        [
                          "Created",
                          selected.created_at
                            ? new Date(selected.created_at).toLocaleString()
                            : "",
                        ],
                        ["Status", (selected.status || "open").toUpperCase()],
                      ].map(([label, val]) => (
                        <View
                          key={label}
                          style={[
                            styles.detailChip,
                            {
                              backgroundColor: colors.card,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.detailChipLabel,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {label}
                          </Text>
                          <Text
                            style={[
                              styles.detailChipValue,
                              { color: colors.text },
                            ]}
                          >
                            {val || "Unknown"}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                );
              })()}
          </View>
        </View>
      </Modal>

      {/* Screenshot modal */}
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
  toolbar: { paddingHorizontal: 18, paddingBottom: 10 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    paddingHorizontal: 12,
    borderWidth: 1,
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
  },
  iconBtn: { padding: 8, borderRadius: 10 },
  filtersRow: { marginTop: 10, flexDirection: "row", gap: 10 },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  pillText: { fontWeight: "700", fontSize: 12 },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 60,
    gap: 10,
  },
  loadingText: { fontWeight: "600" },
  scroll: { paddingHorizontal: 18, paddingBottom: 28 },
  countText: { marginTop: 8, marginBottom: 12, fontSize: 12 },
  reportCard: {
    borderRadius: 22,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  reportTopRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  reportSubject: { fontSize: 15, fontWeight: "800" },
  reportMeta: { marginTop: 4, fontSize: 12 },
  reportDetails: { marginTop: 10, lineHeight: 19 },
  reportBottom: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  smallMuted: { fontSize: 11 },
  hasShot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  hasShotText: { fontSize: 12, fontWeight: "700" },
  statusBadge: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
  statusText: { fontSize: 12, fontWeight: "800" },
  emptyState: { marginTop: 30, padding: 18, alignItems: "center", gap: 8 },
  emptyTitle: { fontWeight: "800" },
  emptyText: { textAlign: "center" },
  deniedCard: {
    marginTop: 18,
    marginHorizontal: 18,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    gap: 10,
  },
  deniedTitle: { fontWeight: "900", fontSize: 14 },
  deniedText: { lineHeight: 18 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
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
  modalTitle: { fontSize: 14, fontWeight: "900" },
  modalSubject: { fontSize: 18, fontWeight: "900", marginTop: 6 },
  modalMeta: { marginTop: 6, lineHeight: 18 },
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
  actionBtnText: { fontWeight: "900", fontSize: 13 },
  detailBlock: { marginTop: 14, borderRadius: 16, padding: 12, borderWidth: 1 },
  detailLabel: { fontSize: 12, fontWeight: "900", marginBottom: 6 },
  detailText: { lineHeight: 19 },
  detailGrid: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  detailChip: { width: "48%", borderWidth: 1, borderRadius: 16, padding: 12 },
  detailChipLabel: { fontSize: 11, fontWeight: "800" },
  detailChipValue: { marginTop: 6, fontWeight: "800" },
  imgBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)" },
  imgHeader: { paddingTop: 50, paddingHorizontal: 16, alignItems: "flex-end" },
  imgClose: { padding: 10 },
  imgBody: { flex: 1, alignItems: "center", justifyContent: "center" },
  imgLoading: { alignItems: "center", gap: 10 },
  imgLoadingText: { color: "#FFFFFF", fontWeight: "700" },
  img: { width: "92%", height: "80%" },
});
