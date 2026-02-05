// components/navigation/CurvedTabBar.tsx
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const TAB_BAR_BASE_HEIGHT = 72; // visible curved container height

export function getTabBarHeight(insetsBottom: number) {
  return TAB_BAR_BASE_HEIGHT + Math.max(insetsBottom, 10);
}

export function CurvedTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = getTabBarHeight(insets.bottom);

  return (
    <View
      style={[
        styles.wrapper,
        { height: tabBarHeight, paddingBottom: Math.max(insets.bottom, 10) },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.bar}>
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;

          // Hide notifications route
          if (route.name === "notifications") return null;

          const isCreate = route.name === "create";

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

          const icon =
            route.name === "home"
              ? "home-outline"
              : route.name === "explore"
                ? "search-outline"
                : route.name === "create"
                  ? "add"
                  : route.name === "chat"
                    ? "chatbubble-ellipses-outline"
                    : "person-outline";

          if (isCreate) {
            return (
              <View
                key={route.key}
                style={styles.centerSlot}
                pointerEvents="box-none"
              >
                <TouchableOpacity
                  onPress={onPress}
                  activeOpacity={0.9}
                  style={styles.centerButton}
                >
                  <Ionicons name={icon as any} size={30} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.85}
              style={styles.tab}
            >
              <Ionicons
                name={icon as any}
                size={24}
                color={isFocused ? "#7C3AED" : "#9CA3AF"}
              />
              <View style={[styles.dot, isFocused && styles.dotActive]} />
            </TouchableOpacity>
          );
        })}
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
    paddingHorizontal: 16,
  },

  // pill bar like the mock
  bar: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14, // tighter like mock
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.06)",

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: Platform.OS === "android" ? 0.16 : 0.1,
    shadowRadius: 20,
    elevation: 12,
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
  dotActive: { backgroundColor: "#7C3AED" },

  // center button should float ABOVE the pill (like mock)
  centerSlot: {
    width: 86,
    alignItems: "center",
    justifyContent: "center",
  },

  centerButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",

    // float effect
    marginTop: -22,

    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: Platform.OS === "android" ? 0.28 : 0.24,
    shadowRadius: 18,
    elevation: 14,
  },
});
