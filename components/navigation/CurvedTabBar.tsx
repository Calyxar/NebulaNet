import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Home, MessageCircle, Plus, Search, User } from "lucide-react-native";
import React, { useMemo } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/providers/ThemeProvider";

export const TAB_BAR_BASE_HEIGHT = 68;

export function getTabBarHeight(insetsBottom: number) {
  const extraAndroidGesture = Platform.OS === "android" ? 8 : 0;
  return TAB_BAR_BASE_HEIGHT + Math.max(insetsBottom, extraAndroidGesture);
}

// ✅ Put tabs in the exact order you want visually
// Example here: Home, Explore, Create, Chat, Profile
const ORDER = ["home", "explore", "create", "chat", "profile"] as const;

export default function CurvedTabBar({ state, navigation }: BottomTabBarProps) {
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
            shadowOpacity: isDark ? 0.25 : 0.1,
            elevation: isDark ? 10 : 20,
          },
        ]}
      >
        {routes.map((route) => {
          const index = state.routes.findIndex((r) => r.key === route.key);
          const isFocused = state.index === index;
          const isCreate = route.name === "create";

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };

          const iconSize = isFocused ? 26 : 24;
          const color = isFocused ? activeColor : inactiveColor;
          const strokeWidth = isFocused ? 2.5 : 2;

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
              case "create":
                return (
                  <View
                    style={[
                      styles.createButton,
                      {
                        backgroundColor: colors.primary,
                        // ✅ NO “light” / NO shine
                        shadowColor: colors.primary,
                        shadowOpacity: isDark ? 0.3 : 0.22,
                        elevation: isDark ? 10 : 6,
                      },
                    ]}
                  >
                    <Plus size={30} color="#FFFFFF" strokeWidth={3} />
                  </View>
                );
              default:
                return null;
            }
          };

          const label =
            route.name === "home"
              ? "Home"
              : route.name === "explore"
                ? "Explore"
                : route.name === "chat"
                  ? "Chat"
                  : route.name === "profile"
                    ? "Profile"
                    : "";

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={[styles.tab, isCreate && styles.createTab]}
              activeOpacity={0.75}
            >
              <Icon />
              {!isCreate && (
                <Text
                  style={[
                    styles.label,
                    { color: inactiveColor },
                    isFocused && { color: activeColor },
                  ]}
                >
                  {label}
                </Text>
              )}
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
    paddingHorizontal: 8,
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
    marginTop: -22,
  },

  createButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    // ✅ no gradient, no highlight, no “light strip”
    overflow: "visible",
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
  },

  label: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
});
