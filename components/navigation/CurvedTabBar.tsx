// components/navigation/CurvedTabBar.tsx
import { Home, MessageCircle, Search, User } from "lucide-react-native";
import React from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ✅ SVG background as a COMPONENT (requires react-native-svg-transformer working)
import SubtractBg from "@/assets/images/Subtract.svg";

// If you prefer PNG instead (most stable), do this:
// const tabBgPng = require("@/assets/images/Subtract.png");

export const TAB_BAR_BASE_HEIGHT = 86;

export function getTabBarHeight(insetsBottom: number) {
  return TAB_BAR_BASE_HEIGHT + Math.max(insetsBottom, 10);
}

type IconName = "home" | "explore" | "chat" | "profile";

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  const color = focused ? "#7C3AED" : "#9CA3AF";
  const size = 24;

  switch (name) {
    case "home":
      return <Home size={size} color={color} />;
    case "explore":
      return <Search size={size} color={color} />;
    case "chat":
      return <MessageCircle size={size} color={color} />;
    default:
      return <User size={size} color={color} />;
  }
}

export function CurvedTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const height = getTabBarHeight(insets.bottom);
  const bottomPad = Math.max(insets.bottom, 10);

  // ✅ tighter padding on narrow phones (Android)
  const horizontalPad = width < 380 ? 10 : 16;

  return (
    <View style={[styles.wrapper, { height }]} pointerEvents="box-none">
      <View style={[styles.inner, { paddingBottom: bottomPad }]}>
        {/* Background */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <SubtractBg width="100%" height="100%" preserveAspectRatio="none" />
          {/*
            If you use PNG instead:
            <Image source={tabBgPng} style={StyleSheet.absoluteFill} resizeMode="stretch" />
          */}
        </View>

        {/* Buttons */}
        <View style={[styles.row, { paddingHorizontal: horizontalPad }]}>
          {state.routes.map((route: any, index: number) => {
            // Hide notifications route from tabbar (still exists for navigation)
            if (route.name === "notifications") return null;

            const focused = state.index === index;
            const isCreate = route.name === "create";

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            if (isCreate) {
              return (
                <View
                  key={route.key}
                  style={styles.centerSlot}
                  pointerEvents="box-none"
                >
                  <Pressable
                    onPress={onPress}
                    style={styles.centerButton}
                    hitSlop={10}
                  >
                    <Image
                      source={require("@/assets/images/512_512_c.png")}
                      style={styles.centerImage}
                    />
                  </Pressable>
                </View>
              );
            }

            const mapped: IconName =
              route.name === "home"
                ? "home"
                : route.name === "explore"
                  ? "explore"
                  : route.name === "chat"
                    ? "chat"
                    : "profile";

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                style={styles.tab}
                android_ripple={{ borderless: true }}
                hitSlop={10}
              >
                <TabIcon name={mapped} focused={focused} />
                <View style={[styles.dot, focused && styles.dotActive]} />
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
  },
  inner: {
    flex: 1,
    borderRadius: 34,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: Platform.OS === "android" ? 0.18 : 0.09,
    shadowRadius: 18,
    elevation: 12,
  },
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tab: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    marginTop: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "transparent",
  },
  dotActive: {
    backgroundColor: "#7C3AED",
  },

  // Center create
  centerSlot: {
    width: 82,
    alignItems: "center",
    justifyContent: "center",
  },
  centerButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateY: -10 }],
  },
  centerImage: {
    width: 66,
    height: 66,
    resizeMode: "contain",
  },
});
