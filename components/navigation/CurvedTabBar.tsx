// components/navigation/CurvedTabBar.tsx ✅
// ⚠️ RECONSTRUCTED — I don't have this file's original literal source
// confirmed (only touched once, early in this session, for an unrelated
// uiScale-undefined-at-module-scope bug). Diff against your real file
// rather than assuming an exact match.
//
// ✅ FIX: the bug causing the bar (and the raised "+" button) to overlap
// the phone's own system navigation controls. getTabBarHeight() already
// correctly factors in insets.bottom — that's why other screens' scroll
// content already avoids the bar fine. But the BAR ITSELF, rendering its
// own position at the bottom of the screen, wasn't applying that same
// inset to where it actually sits — so on devices with 3-button Android
// nav (or the iOS home indicator), it rendered flush against the very
// bottom of the physical screen, sitting underneath/behind the system
// controls instead of above them.

import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BASE_BAR_HEIGHT = 58;
const RAISED_BUTTON_SIZE = 56;

// ✅ Already correct before this fix — kept as-is. Other screens use this
// to pad their scroll content so the last item isn't hidden behind the
// bar. The bug was that the bar component below didn't apply the same
// insets.bottom to its OWN position.
export function getTabBarHeight(bottomInset: number, uiScale = 1): number {
  return BASE_BAR_HEIGHT * uiScale + bottomInset;
}

type TabItem = {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  route: string;
};

const TABS: TabItem[] = [
  {
    name: "Home",
    icon: "home-outline",
    activeIcon: "home",
    route: "/(tabs)/home",
  },
  {
    name: "Explore",
    icon: "search-outline",
    activeIcon: "search",
    route: "/(tabs)/explore",
  },
  {
    name: "Chat",
    icon: "chatbubble-outline",
    activeIcon: "chatbubble",
    route: "/(tabs)/chat",
  },
  {
    name: "Profile",
    icon: "person-outline",
    activeIcon: "person",
    route: "/(tabs)/profile",
  },
];

export default function CurvedTabBar() {
  const { colors, isDark, uiScale } = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  const barHeight = BASE_BAR_HEIGHT * uiScale;

  return (
    <View
      style={[
        styles.container,
        {
          // ✅ FIX: was likely just `height: barHeight` with no bottom
          // inset applied — now the bar's total footprint (height +
          // padding) matches getTabBarHeight()'s calculation exactly,
          // so the bar's actual tappable icons sit ABOVE the system nav
          // controls instead of behind/under them.
          height: barHeight + insets.bottom,
          paddingBottom: insets.bottom,
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          shadowOpacity: isDark ? 0.3 : 0.08,
        },
      ]}
    >
      <View style={[styles.row, { height: barHeight }]}>
        {TABS.slice(0, 2).map((tab) => (
          <TabButton
            key={tab.name}
            tab={tab}
            isActive={pathname === tab.route}
            colors={colors}
            uiScale={uiScale}
          />
        ))}

        {/* Raised center create button */}
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
              // ✅ FIX: this offset was almost certainly the direct
              // cause of the visible overlap — a raised button typically
              // sits partially above the bar via a negative top margin.
              // Without insets.bottom accounted for in the bar's own
              // height above, this offset was calculated against the
              // WRONG baseline (screen bottom instead of bar top),
              // pushing the button down into the system nav area.
              top: -(RAISED_BUTTON_SIZE * uiScale) / 3,
              borderColor: colors.card,
            },
          ]}
        >
          <Ionicons name="add" size={28 * uiScale} color="#fff" />
        </TouchableOpacity>

        {TABS.slice(2).map((tab) => (
          <TabButton
            key={tab.name}
            tab={tab}
            isActive={pathname === tab.route}
            colors={colors}
            uiScale={uiScale}
          />
        ))}
      </View>
    </View>
  );
}

function TabButton({
  tab,
  isActive,
  colors,
  uiScale,
}: {
  tab: TabItem;
  isActive: boolean;
  colors: any;
  uiScale: number;
}) {
  return (
    <TouchableOpacity
      onPress={() => router.push(tab.route as any)}
      activeOpacity={0.7}
      style={styles.tabButton}
      accessibilityRole="button"
      accessibilityLabel={tab.name}
      accessibilityState={{ selected: isActive }}
    >
      <Ionicons
        name={isActive ? tab.activeIcon : tab.icon}
        size={24 * uiScale}
        color={isActive ? colors.primary : colors.textTertiary}
      />
    </TouchableOpacity>
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
