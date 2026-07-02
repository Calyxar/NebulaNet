// components/feed/AnnouncementCard.tsx
// Firestore-backed announcement card shown at top of For You feed.
// ✅ Swipe-down-to-dismiss — card follows your finger, springs back if
//    you release before the threshold, slides off and fades if you go past.
//    Matching Bluesky's pattern. No extra packages — PanResponder + Animated.
// ✅ Dismissed once per announcement ID, persisted in AsyncStorage.
//    Once dismissed it never shows again, even across app restarts.
// ✅ storageLoaded gate — prevents the card flashing briefly on mount
//    before AsyncStorage has loaded the dismissed ID. Returns null until
//    storage check is complete.
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
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const DISMISSED_KEY = "nebulanet:dismissed_announcement";
const DISMISS_THRESHOLD = 80;

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
    console.warn("[Announcement] fetchActiveAnnouncement failed:", err);
    return null;
  }
}

export default function AnnouncementCard() {
  const { colors, isDark } = useTheme();
  const [dismissed, setDismissed] = useState(false);
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  // ✅ Gate: don't render anything until AsyncStorage has been checked.
  // Without this, the card briefly flashes on every launch before the
  // dismissed ID loads, even if the user already dismissed it.
  const [storageLoaded, setStorageLoaded] = useState(false);

  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const { data: announcement } = useQuery({
    queryKey: ["active-announcement"],
    queryFn: fetchActiveAnnouncement,
    staleTime: 5 * 60 * 1000,
  });

  // Load dismissed ID from storage — set storageLoaded regardless of outcome
  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY)
      .then((val) => {
        if (val) setDismissedId(val);
        setStorageLoaded(true);
      })
      .catch(() => setStorageLoaded(true));
  }, []);

  // Reset animation values when a new announcement loads
  useEffect(() => {
    translateY.setValue(0);
    opacity.setValue(1);
  }, [announcement?.id]);

  const handleDismiss = useCallback(async () => {
    if (!announcement) return;
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 300,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setDismissed(true);
      setDismissedId(announcement.id);
    });
    try {
      await AsyncStorage.setItem(DISMISSED_KEY, announcement.id);
    } catch {}
  }, [announcement, translateY, opacity]);

  const handleCTA = useCallback(() => {
    if (announcement?.cta_url) {
      Linking.openURL(announcement.cta_url).catch(() => {});
    }
  }, [announcement]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, gs) => {
          return gs.dy > 8 && Math.abs(gs.dy) > Math.abs(gs.dx);
        },
        onPanResponderMove: (_e, gs) => {
          const clampedY = Math.max(0, gs.dy);
          translateY.setValue(clampedY);
          const progress = Math.min(clampedY / DISMISS_THRESHOLD, 1);
          opacity.setValue(1 - progress * 0.4);
        },
        onPanResponderRelease: (_e, gs) => {
          if (gs.dy >= DISMISS_THRESHOLD || gs.vy > 0.8) {
            void handleDismiss();
          } else {
            Animated.parallel([
              Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
                tension: 120,
                friction: 8,
              }),
              Animated.timing(opacity, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
              }),
            ]).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.parallel([
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              tension: 120,
              friction: 8,
            }),
            Animated.timing(opacity, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();
        },
      }),
    [handleDismiss, translateY, opacity],
  );

  // ✅ Don't render until storage is loaded — prevents flash
  if (!storageLoaded) return null;
  if (!announcement) return null;
  if (dismissed) return null;
  if (dismissedId === announcement.id) return null;

  const gradientColors = isDark
    ? (["#3B1F72", "#1E1040"] as const)
    : (["#7C3AED", "#5B21B6"] as const);

  return (
    <Animated.View
      style={[
        styles.container,
        { marginHorizontal: 14, marginBottom: 12 },
        { transform: [{ translateY }], opacity },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.dragHandleWrap}>
        <View style={styles.dragHandle} />
      </View>

      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
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

          <TouchableOpacity
            onPress={handleDismiss}
            style={styles.dismissBtn}
            activeOpacity={0.8}
            hitSlop={10}
          >
            <Ionicons name="close" size={16} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>{announcement.title}</Text>
        <Text style={styles.body}>{announcement.body}</Text>

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

        <View style={styles.footer}>
          <Ionicons
            name="megaphone-outline"
            size={12}
            color="rgba(255,255,255,0.5)"
          />
          <Text style={styles.footerText}>Swipe down to dismiss</Text>
        </View>
      </LinearGradient>
    </Animated.View>
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
  dragHandleWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingTop: 8,
    zIndex: 10,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  gradient: {
    padding: 16,
    paddingTop: 22,
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
  avatarWrap: { position: "relative" },
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
  authorName: { color: "#fff", fontSize: 15, fontWeight: "900" },
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
  versionText: { color: "#fff", fontSize: 10, fontWeight: "800" },
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
  ctaText: { color: "#7C3AED", fontSize: 13, fontWeight: "800" },
  footer: { flexDirection: "row", alignItems: "center", gap: 5 },
  footerText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontWeight: "600",
  },
});
