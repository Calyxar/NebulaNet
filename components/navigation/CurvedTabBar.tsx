import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import {
  Home,
  MessageCircle,
  PlusCircle,
  Search,
  User,
} from "lucide-react-native";
import React from "react";
import {
  Platform,
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

export default function CurvedTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const height = getTabBarHeight(insets.bottom);

  return (
    <View style={[styles.container, { height }]}>
      <View
        style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}
      >
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

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

          const iconSize = isFocused ? 26 : 24;
          const color = isFocused ? "#7C3AED" : "#9CA3AF";
          const strokeWidth = isFocused ? 2.5 : 2;

          const isCreate = route.name === "create";

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
              case "create":
                return (
                  <View style={styles.createButton}>
                    <PlusCircle
                      size={32}
                      color="#fff"
                      fill="#7C3AED"
                      strokeWidth={2}
                    />
                  </View>
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
              activeOpacity={0.7}
            >
              <Icon />
              {!isCreate && (
                <Text style={[styles.label, isFocused && styles.labelActive]}>
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
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  createTab: {
    marginTop: -20,
  },
  createButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    marginTop: 4,
  },
  labelActive: {
    color: "#7C3AED",
  },
});
