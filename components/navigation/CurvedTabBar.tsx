import { useTheme } from "@/providers/ThemeProvider";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import {
  Bell,
  Home,
  MessageCircle,
  Plus,
  Search,
  User,
} from "lucide-react-native";
import React, { useMemo, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const TAB_BAR_BASE_HEIGHT = 68;

export function getTabBarHeight(insetsBottom: number) {
  const extraAndroidGesture = Platform.OS === "android" ? 8 : 0;
  return TAB_BAR_BASE_HEIGHT + Math.max(insetsBottom, extraAndroidGesture);
}

// ✅ 6 tabs — even spacing
const ORDER = [
  "home",
  "explore",
  "create",
  "chat",
  "notifications",
  "profile",
] as const;

function CreateTabButton({
  onPress,
  colors,
  isDark,
}: {
  onPress: () => void;
  colors: any;
  isDark: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);

  const pressIn = () => {
    setPressed(true);
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 28,
      bounciness: 4,
    }).start();
  };

  const pressOut = () => {
    setPressed(false);
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 26,
      bounciness: 6,
    }).start();
  };

  const handlePress = () => {
    void Haptics.selectionAsync();
    onPress();
  };

  return (
    <Pressable
      onPressIn={pressIn}
      onPressOut={pressOut}
      onPress={handlePress}
      hitSlop={14}
      style={styles.createPressable}
    >
      <Animated.View
        style={[
          styles.createButton,
          {
            backgroundColor: colors.primary,
            borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)",
            transform: [{ scale }],
          },
        ]}
      >
        <View
          pointerEvents="none"
          style={[
            styles.softPressOverlay,
            { opacity: pressed ? 0.08 : 0, backgroundColor: "#000" },
          ]}
        />
        <Plus size={26} color="#FFFFFF" strokeWidth={3} />
      </Animated.View>
    </Pressable>
  );
}

export default function CurvedTabBar({
  state,
  navigation,
  descriptors,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const height = getTabBarHeight(insets.bottom);
  const { colors, isDark } = useTheme();

  const activeColor = colors.primary;
  const inactiveColor = colors.textTertiary;

  const routes = useMemo(() => {
    const map = new Map(state.routes.map((r) => [r.name, r]));
    const ordered = ORDER.map((name) => map.get(name)).filter(Boolean);
    const leftovers = state.routes.filter(
      (r) => !ORDER.includes(r.name as any),
    );
    return [...(ordered as typeof state.routes), ...leftovers];
  }, [state.routes]);

  return (
    <View style={[styles.container, { height }]}>
      <View
        style={[
          styles.tabBar,
          {
            paddingBottom: Math.max(insets.bottom, 8),
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            shadowOpacity: isDark ? 0.18 : 0.08,
            elevation: isDark ? 8 : 4,
          },
        ]}
      >
        {routes.map((route) => {
          const index = state.routes.findIndex((r) => r.key === route.key);
          const isFocused = state.index === index;
          const isCreate = route.name === "create";

          const badge = descriptors?.[route.key]?.options?.tabBarBadge;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!event.defaultPrevented)
              navigation.navigate(route.name as never);
          };

          const iconSize = isFocused ? 24 : 22;
          const color = isFocused ? activeColor : inactiveColor;
          const strokeWidth = isFocused ? 2.5 : 2;

          const label =
            route.name === "home"
              ? "Home"
              : route.name === "explore"
                ? "Explore"
                : route.name === "chat"
                  ? "Chat"
                  : route.name === "notifications"
                    ? "Alerts"
                    : route.name === "profile"
                      ? "Profile"
                      : "";

          if (isCreate) {
            return (
              <View key={route.key} style={[styles.tab, styles.createTab]}>
                <CreateTabButton
                  onPress={onPress}
                  colors={colors}
                  isDark={isDark}
                />
              </View>
            );
          }

          const Icon = () => {
            switch (route.name) {
              case "home":
                return (
                  <Home
                    size={iconSize}
                    color={color}
                    strokeWidth={strokeWidth}
                  />
                );
              case "explore":
                return (
                  <Search
                    size={iconSize}
                    color={color}
                    strokeWidth={strokeWidth}
                  />
                );
              case "chat":
                return (
                  <MessageCircle
                    size={iconSize}
                    color={color}
                    strokeWidth={strokeWidth}
                  />
                );
              case "notifications":
                return (
                  <Bell
                    size={iconSize}
                    color={color}
                    strokeWidth={strokeWidth}
                  />
                );
              case "profile":
                return (
                  <User
                    size={iconSize}
                    color={color}
                    strokeWidth={strokeWidth}
                  />
                );
              default:
                return null;
            }
          };

          const showBadge =
            badge !== undefined &&
            badge !== null &&
            badge !== 0 &&
            !(typeof badge === "string" && badge.length === 0);

          return (
            <TouchableOpacity
              key={route.key}
              onPress={() => {
                void Haptics.selectionAsync();
                onPress();
              }}
              style={styles.tab}
              activeOpacity={0.85}
            >
              <View style={styles.iconWrap}>
                <Icon />
                {showBadge ? (
                  <View style={[styles.badge, { borderColor: colors.card }]}>
                    <Text style={styles.badgeText}>{String(badge)}</Text>
                  </View>
                ) : null}
              </View>
              <Text
                style={[
                  styles.label,
                  { color: inactiveColor },
                  isFocused && { color: activeColor },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
  },
  tabBar: {
    flex: 1,
    flexDirection: "row",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 0,
    borderTopWidth: Platform.OS === "android" ? 1 : 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 12,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  createTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -20,
  },
  createPressable: {
    alignItems: "center",
    justifyContent: "center",
  },
  createButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 0,
    elevation: 0,
    borderWidth: 1,
    overflow: "hidden",
  },
  softPressOverlay: { ...StyleSheet.absoluteFillObject },
  label: { fontSize: 10, fontWeight: "700", marginTop: 4 },
  iconWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EF4444",
    borderWidth: 2,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "900" },
});
