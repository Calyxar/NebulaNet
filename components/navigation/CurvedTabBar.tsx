// components/navigation/CurvedTabBar.tsx
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const TAB_BAR_BASE_HEIGHT = 72; // the visible curved container height

export function getTabBarHeight(insetsBottom: number) {
  // Android often has 0 insets, iPhone has home indicator
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
    >
      <View style={styles.bar}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          // Hide notifications route
          if (route.name === "notifications") return null;

          // Center "create" slot (your design likely has a bigger button)
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
              <View key={route.key} style={styles.centerSlot}>
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
  bar: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: Platform.OS === "android" ? 0.14 : 0.08,
    shadowRadius: 18,
    elevation: 10,
  },
  tab: {
    width: 56,
    height: 54,
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
    width: 76,
    alignItems: "center",
    justifyContent: "center",
  },
  centerButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: Platform.OS === "android" ? 0.25 : 0.22,
    shadowRadius: 16,
    elevation: 12,
  },
});
