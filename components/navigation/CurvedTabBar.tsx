// components/navigation/CurvedTabBar.tsx
import {
  Home,
  MessageCircle,
  Search,
  SquarePen, // post icon
  User,
} from "lucide-react-native";
import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const TAB_BAR_BASE_HEIGHT = 70;

export function getTabBarHeight(insetsBottom: number) {
  return TAB_BAR_BASE_HEIGHT + Math.max(insetsBottom, 10);
}

type IconName = "home" | "explore" | "chat" | "profile";

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  const active = "#7C3AED";
  const inactive = "#9CA3AF";
  const color = focused ? active : inactive;
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

  // ✅ Light-mode colors matching your design
  const SCREEN_BG = "#F5F7FF";
  const BAR_BG = "#FFFFFF";
  const BORDER = "#E6EAF5";

  // ✅ Responsive sizes (Samsung A54 friendly)
  const barRadius = 26;
  const postSize = width < 380 ? 54 : 60;

  // ✅ A54: don’t lift too high, keep it “attached”
  const lift = Platform.OS === "android" ? 14 : 12;

  const activeRoute = state.routes[state.index]?.name;

  const onPost = () => {
    navigation.navigate("create"); // center action route
  };

  return (
    <View style={[styles.wrapper, { height }]} pointerEvents="box-none">
      {/* Floating Post Button */}
      <View style={styles.postSlot} pointerEvents="box-none">
        <Pressable
          onPress={onPost}
          hitSlop={12}
          style={[
            styles.postBtn,
            {
              width: postSize,
              height: postSize,
              borderRadius: postSize / 2,
              transform: [{ translateY: -lift }],
              backgroundColor: "#7C3AED",
              borderColor: BAR_BG,
            },
          ]}
        >
          <SquarePen size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Bottom Bar */}
      <View
        style={[
          styles.bar,
          {
            backgroundColor: BAR_BG,
            borderColor: BORDER,
            borderRadius: barRadius,
            paddingBottom: bottomPad,
          },
        ]}
      >
        <View style={styles.row}>
          {state.routes.map((route: any) => {
            if (route.name === "notifications") return null;

            const isCreate = route.name === "create";
            const focused = activeRoute === route.name;

            // Reserve space under the floating post button
            if (isCreate) return <View key={route.key} style={{ width: 76 }} />;

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

        {/* ✅ This “base strip” helps blend into the screen bg on A54 */}
        <View style={[styles.bottomBlend, { backgroundColor: SCREEN_BG }]} />
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

  bar: {
    overflow: "hidden",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: Platform.OS === "android" ? 0.12 : 0.08,
    shadowRadius: 14,
    elevation: 8,
  },

  row: {
    height: TAB_BAR_BASE_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
  },

  tab: {
    width: 58,
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

  // Floating Post button
  postSlot: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    alignItems: "center",
    zIndex: 50,
  },
  postBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4, // white ring like the design
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: Platform.OS === "android" ? 0.18 : 0.12,
    shadowRadius: 14,
    elevation: 12,
  },

  // subtle blend strip (prevents harsh edge over gesture bar)
  bottomBlend: {
    height: 10,
    width: "100%",
  },
});
