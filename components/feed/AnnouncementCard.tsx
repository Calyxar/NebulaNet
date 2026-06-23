// components/feed/AnnouncementCard.tsx
// Firestore-backed announcement card shown at top of For You feed
// Dismissible per announcement — stores dismissed ID in AsyncStorage
// Manage from Firebase Console: announcements collection
// Fields: id (string), title (string), body (string), active (bool), created_at (string)
// Optional: cta_label (string), cta_url (string), version (string)

import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import firestore from "@react-native-firebase/firestore";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import React, { useCallback, useEffect, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const DISMISSED_KEY = "nebulanet:dismissed_announcement";

type Announcement = {
  id: string;
  title: string;
  body: string;
  active: boolean;
  created_at: string;
  cta_label?: string | null;
  cta_url?: string | null;
  version?: string | null;
};

async function fetchActiveAnnouncement(): Promise<Announcement | null> {
  try {
    const snap = await firestore()
      .collection("announcements")
      .where("active", "==", true)
      .orderBy("created_at", "desc")
      .limit(1)
      .get();

    if (snap.empty) return null;
    const d = snap.docs[0].data() as any;
    return {
      id: snap.docs[0].id,
      title: d.title ?? "",
      body: d.body ?? "",
      active: d.active ?? true,
      created_at: d.created_at ?? "",
      cta_label: d.cta_label ?? null,
      cta_url: d.cta_url ?? null,
      version: d.version ?? null,
    };
  } catch (err) {
    // ✅ NEW: this query needs a composite index (active + created_at).
    // Previously, an index error here failed completely silently — the
    // card just never appeared, with no visible error anywhere. Now it
    // logs clearly so this can't silently regress again.
    console.warn("[Announcement] fetchActiveAnnouncement failed:", err);
    return null;
  }
}

export default function AnnouncementCard() {
  const { colors, isDark } = useTheme();
  const [dismissed, setDismissed] = useState(false);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  const { data: announcement } = useQuery({
    queryKey: ["active-announcement"],
    queryFn: fetchActiveAnnouncement,
    staleTime: 5 * 60 * 1000, // re-check every 5 min
  });

  // Load dismissed announcement ID from storage
  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY)
      .then((val) => {
        if (val) setDismissedId(val);
      })
      .catch(() => {});
  }, []);

  const handleDismiss = useCallback(async () => {
    if (!announcement) return;
    setDismissed(true);
    setDismissedId(announcement.id);
    try {
      await AsyncStorage.setItem(DISMISSED_KEY, announcement.id);
    } catch {}
  }, [announcement]);

  const handleCTA = useCallback(() => {
    if (announcement?.cta_url) {
      Linking.openURL(announcement.cta_url).catch(() => {});
    }
  }, [announcement]);

  // Don't show if no announcement, already dismissed, or same announcement dismissed before
  if (!announcement) return null;
  if (dismissed) return null;
  // if (dismissedId === announcement.id) return null;

  const gradientColors = isDark
    ? (["#3B1F72", "#1E1040"] as const)
    : (["#7C3AED", "#5B21B6"] as const);

  return (
    <View
      style={[styles.container, { marginHorizontal: 14, marginBottom: 12 }]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Header row */}
        <View style={styles.header}>
          <View style={styles.authorRow}>
            <View style={styles.avatarWrap}>
              <Image
                source={require("@/assets/images/icon.png")}
                style={styles.avatar}
              />
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={8} color="#fff" />
              </View>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
              >
                <Text style={styles.authorName}>NebulaNet</Text>
                {!!announcement.version && (
                  <View style={styles.versionBadge}>
                    <Text style={styles.versionText}>
                      {announcement.version}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.authorHandle}>@nebulanet</Text>
            </View>
          </View>

          {/* Dismiss button */}
          <TouchableOpacity
            onPress={handleDismiss}
            style={styles.dismissBtn}
            activeOpacity={0.8}
            hitSlop={10}
          >
            <Ionicons name="close" size={16} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <Text style={styles.title}>{announcement.title}</Text>
        <Text style={styles.body}>{announcement.body}</Text>

        {/* CTA button */}
        {!!announcement.cta_label && !!announcement.cta_url && (
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={handleCTA}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaText}>{announcement.cta_label}</Text>
            <Ionicons name="arrow-forward" size={14} color="#7C3AED" />
          </TouchableOpacity>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Ionicons
            name="megaphone-outline"
            size={12}
            color="rgba(255,255,255,0.5)"
          />
          <Text style={styles.footerText}>Official announcement</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  gradient: {
    padding: 16,
    borderRadius: 22,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#7C3AED",
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  authorName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
  authorHandle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 1,
  },
  versionBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  versionText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  dismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 6,
    lineHeight: 22,
  },
  body: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: "500",
    marginBottom: 14,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    marginBottom: 12,
  },
  ctaText: {
    color: "#7C3AED",
    fontSize: 13,
    fontWeight: "800",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  footerText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontWeight: "600",
  },
});
