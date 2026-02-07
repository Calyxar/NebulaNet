// components/navigation/CurvedTabBar.tsx
// ✅ Fixed spacing for Samsung A54 and Android gesture navigation
// ✅ Proper bottom padding to avoid phone controls

import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import {
  Home,
  MessageCircle,
  PlusCircle,
  Search,
  User,
} from "lucide-react-native";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ✅ FIXED: Increased spacing for Samsung gesture navigation
export const TAB_BAR_HEIGHT = 68;
export const EXTRA_BOTTOM_PADDING = 20; // Extra space for gesture controls
export const TAB_BAR_TOTAL_BOTTOM_PADDING =
  TAB_BAR_HEIGHT + EXTRA_BOTTOM_PADDING;

export default function CurvedTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // ✅ Calculate proper bottom spacing for different devices
  // Use the larger of: safe area insets or our extra padding
  const bottomSpacing = Math.max(insets.bottom, EXTRA_BOTTOM_PADDING);

  return (
    <View
      style={[
        styles.container,
        {
          bottom: bottomSpacing, // ✅ CRITICAL: Lift the entire tab bar up
          height: TAB_BAR_HEIGHT,
        },
      ]}
    >
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
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

          // Get icon for each tab
          const getIcon = () => {
            const iconSize = isFocused ? 26 : 24;
            const color = isFocused ? "#7C3AED" : "#9CA3AF";
            const strokeWidth = isFocused ? 2.5 : 2;

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

          // Get label for each tab
          const getLabel = () => {
            switch (route.name) {
              case "home":
                return "Home";
              case "explore":
                return "Explore";
              case "create":
                return ""; // No label for center create button
              case "chat":
                return "Chat";
              case "profile":
                return "Profile";
              default:
                return route.name;
            }
          };

          const isCreateButton = route.name === "create";

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={[styles.tab, isCreateButton && styles.createTab]}
              activeOpacity={0.7}
            >
              {getIcon()}
              {!isCreateButton && (
                <Text style={[styles.label, isFocused && styles.labelActive]}>
                  {getLabel()}
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
    marginTop: -20, // Lift the create button
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
