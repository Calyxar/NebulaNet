import { useTheme } from "@/providers/ThemeProvider";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { Home, MessageCircle, Plus, Search, User } from "lucide-react-native";
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

export const TAB_BAR_BASE_HEIGHT = 64;

export function getTabBarHeight(insetsBottom: number) {
  const extraAndroidGesture = Platform.OS === "android" ? 8 : 0;
  return TAB_BAR_BASE_HEIGHT + Math.max(insetsBottom, extraAndroidGesture);
}

// ✅ 5 tabs — clean even spacing
const ORDER = ["home", "explore", "create", "chat", "profile"] as const;

function CreateTabButton({
  onPress,
  colors,
  isDark,
  uiScale,
  styles,
}: {
  onPress: () => void;
  colors: any;
  isDark: boolean;
  uiScale: number;
  styles: ReturnType<typeof makeStyles>;
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
        <Plus size={28 * uiScale} color="#FFFFFF" strokeWidth={3} />
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
  const { colors, isDark, uiScale } = useTheme();

  const styles = makeStyles(uiScale);

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

          // Icon-only nav (Twitter/Bluesky style) — slightly larger now that
          // there's no label competing for vertical space underneath.
          const iconSize = (isFocused ? 28 : 26) * uiScale;
          const color = isFocused ? activeColor : inactiveColor;
          const strokeWidth = isFocused ? 2.5 : 2;

          if (isCreate) {
            return (
              <View key={route.key} style={[styles.tab, styles.createTab]}>
                <CreateTabButton
                  onPress={onPress}
                  colors={colors}
                  isDark={isDark}
                  uiScale={uiScale}
                  styles={styles}
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
              accessibilityRole="button"
              accessibilityLabel={route.name}
              accessibilityState={{ selected: isFocused }}
            >
              <View style={styles.iconWrap}>
                <Icon />
                {showBadge ? (
                  <View style={[styles.badge, { borderColor: colors.card }]}>
                    <Text style={styles.badgeText}>{String(badge)}</Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (uiScale: number) =>
  StyleSheet.create({
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
      borderTopLeftRadius: 28 * uiScale,
      borderTopRightRadius: 28 * uiScale,
      paddingTop: 14 * uiScale,
      paddingHorizontal: 4 * uiScale,
      borderTopWidth: Platform.OS === "android" ? 1 : 0,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowRadius: 12,
    },
    tab: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 8 * uiScale,
    },
    createTab: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      marginTop: -20 * uiScale,
    },
    createPressable: {
      alignItems: "center",
      justifyContent: "center",
    },
    createButton: {
      width: 56 * uiScale,
      height: 56 * uiScale,
      borderRadius: 28 * uiScale,
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
    iconWrap: {
      position: "relative",
      alignItems: "center",
      justifyContent: "center",
    },
    badge: {
      position: "absolute",
      top: -6 * uiScale,
      right: -12 * uiScale,
      minWidth: 18 * uiScale,
      height: 18 * uiScale,
      borderRadius: 9 * uiScale,
      paddingHorizontal: 5 * uiScale,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#EF4444",
      borderWidth: 2 * uiScale,
    },
    badgeText: { color: "#fff", fontSize: 11 * uiScale, fontWeight: "900" },
  });
