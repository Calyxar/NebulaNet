// components/navigation/CurvedTabBar.tsx ✅ FIXED
// ✅ FIXED: this is used as a custom `tabBar` renderer inside
// app/(tabs)/_layout.tsx's Tab.Navigator, which passes it real React
// Navigation props (state, descriptors, navigation, insets) — my
// previous reconstruction took NO props at all and built its own route
// list via usePathname(), which is why TypeScript flagged "no properties
// in common with IntrinsicAttributes": the component's signature didn't
// accept what was actually being passed to it. Rebuilt around the
// standard BottomTabBarProps pattern instead.
// ✅ Also: `insets` now comes from the prop React Navigation already
// passes in (which it gets from useSafeAreaInsets() internally), rather
// than calling the hook a second time independently — more correct and
// consistent with how the rest of the navigator already handles it.
// ✅ Per-tab icons are read from each route's own `options.tabBarIcon`
// (already configured per-screen in _layout.tsx's Tab.Screen options)
// instead of a hardcoded icon list here, so this component doesn't need
// to duplicate/guess at route-to-icon mapping.

import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

const BASE_BAR_HEIGHT = 58;
const RAISED_BUTTON_SIZE = 56;

// ✅ Unchanged — other screens still use this for content padding, and
// it was already correctly factoring in the bottom inset.
export function getTabBarHeight(bottomInset: number, uiScale = 1): number {
  return BASE_BAR_HEIGHT * uiScale + bottomInset;
}

export default function CurvedTabBar({
  state,
  descriptors,
  navigation,
  insets,
}: BottomTabBarProps) {
  const { colors, isDark, uiScale } = useTheme();
  const barHeight = BASE_BAR_HEIGHT * uiScale;

  const routes = state.routes;
  // The raised "+" create button sits between the two "halves" of the
  // real tab routes — not a route itself, just a visual insertion point.
  const midpoint = Math.ceil(routes.length / 2);
  const leftRoutes = routes.slice(0, midpoint);
  const rightRoutes = routes.slice(midpoint);

  const renderTab = (route: (typeof routes)[number], index: number) => {
    const { options } = descriptors[route.key];
    const isFocused = state.index === state.routes.indexOf(route);
    const color = isFocused ? colors.primary : colors.textTertiary;

    const onPress = () => {
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <TouchableOpacity
        key={route.key}
        onPress={onPress}
        activeOpacity={0.7}
        style={styles.tabButton}
        accessibilityRole="button"
        accessibilityLabel={
          (options.tabBarAccessibilityLabel as string) ?? route.name
        }
        accessibilityState={{ selected: isFocused }}
      >
        {options.tabBarIcon ? (
          options.tabBarIcon({ focused: isFocused, color, size: 24 * uiScale })
        ) : (
          <Ionicons name="ellipse-outline" size={24 * uiScale} color={color} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          // ✅ FIX preserved from the previous pass: the bar's own
          // footprint includes insets.bottom, so it (and the raised
          // button) sit above the system nav controls instead of
          // rendering flush against the physical screen bottom.
          height: barHeight + insets.bottom,
          paddingBottom: insets.bottom,
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          shadowOpacity: isDark ? 0.3 : 0.08,
        },
      ]}
    >
      <View style={[styles.row, { height: barHeight }]}>
        {leftRoutes.map(renderTab)}

        <TouchableOpacity
          onPress={() => router.push("/create/post" as any)}
          activeOpacity={0.85}
          style={[
            styles.raisedButton,
            {
              width: RAISED_BUTTON_SIZE * uiScale,
              height: RAISED_BUTTON_SIZE * uiScale,
              borderRadius: (RAISED_BUTTON_SIZE * uiScale) / 2,
              backgroundColor: colors.primary,
              top: -(RAISED_BUTTON_SIZE * uiScale) / 3,
              borderColor: colors.card,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Create post"
        >
          <Ionicons name="add" size={28 * uiScale} color="#fff" />
        </TouchableOpacity>

        {rightRoutes.map(renderTab)}
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 12,
    elevation: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  raisedButton: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});
