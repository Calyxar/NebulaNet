// components/navigation/CurvedTabBar.tsx
import { Home, MessageCircle, Search, User } from "lucide-react-native";
import React from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ✅ SVG background as a COMPONENT (NOT Image)
import TabBarBg from "@/assets/images/Component1.svg";

export const TAB_BAR_BASE_HEIGHT = 86;

export function getTabBarHeight(insetsBottom: number) {
  return TAB_BAR_BASE_HEIGHT + Math.max(insetsBottom, 10);
}

function Icon({
  name,
  focused,
}: {
  name: "home" | "explore" | "chat" | "profile";
  focused: boolean;
}) {
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
  const height = getTabBarHeight(insets.bottom);

  return (
    <View style={[styles.wrapper, { height }]} pointerEvents="box-none">
      <View
        style={[styles.inner, { paddingBottom: Math.max(insets.bottom, 10) }]}
      >
        {/* SVG background */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <TabBarBg width="100%" height="100%" preserveAspectRatio="none" />
        </View>

        {/* Buttons row */}
        <View style={styles.row}>
          {state.routes.map((route: any, index: number) => {
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
                  <Pressable onPress={onPress} style={styles.centerButton}>
                    <Image
                      source={require("@/assets/images/512_512_c.png")}
                      style={styles.centerImage}
                    />
                  </Pressable>
                </View>
              );
            }

            const mapped =
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
              >
                <Icon name={mapped as any} focused={focused} />
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
    overflow: "hidden", // ✅ keeps SVG clipped to the pill shape
  },
  row: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  tab: {
    width: 58,
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
