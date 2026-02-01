import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    Dimensions,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: W } = Dimensions.get("window");

export function CurvedTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();

  const active = "#7C3AED";
  const inactive = "#8E8E93";
  const barBg = "#0B0B0F";

  const barHeight = 70 + Math.max(insets.bottom, 10);
  const notchWidth = 96;
  const notchDepth = 26;

  const routeMeta: Record<
    string,
    { label: string; icon: keyof typeof Ionicons.glyphMap }
  > = {
    home: { label: "Home", icon: "home" },
    explore: { label: "Explore", icon: "search" },
    chat: { label: "Chat", icon: "chatbubble-ellipses" },
    profile: { label: "Profile", icon: "person" },
  };

  const visibleRoutes = state.routes.filter(
    (r: any) => r.name !== "create" && r.name !== "notifications",
  );

  return (
    <View style={[styles.wrap, { height: barHeight }]}>
      {/* Bar background */}
      <View style={[styles.bar, { backgroundColor: barBg }]} />

      {/* Notch "cutout" illusion */}
      <View
        pointerEvents="none"
        style={[
          styles.notch,
          {
            width: notchWidth,
            height: notchDepth * 2,
            top: -notchDepth,
            backgroundColor: "transparent",
          },
        ]}
      >
        {/* This inner view matches the screen background to fake a cutout.
            If your main screens are not white, set this to your app background. */}
        <View
          style={[
            styles.notchInner,
            {
              backgroundColor: "#FFFFFF",
              borderBottomLeftRadius: 32,
              borderBottomRightRadius: 32,
            },
          ]}
        />
      </View>

      {/* Center button */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate("create")}
        style={[
          styles.centerBtn,
          {
            backgroundColor: active,
            shadowColor: active,
            borderColor: barBg,
          },
        ]}
      >
        {/* Swap to your image if you want */}
        <Ionicons name="aperture" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Tabs */}
      <View
        style={[styles.row, { paddingBottom: Math.max(insets.bottom, 10) }]}
      >
        {visibleRoutes.map((route: any) => {
          const index = state.routes.findIndex((r: any) => r.key === route.key);
          const isFocused = state.index === index;

          const meta = routeMeta[route.name];
          if (!meta) return null;

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

          // Add spacer before Chat so the center button has room
          const addSpacer = route.name === "chat";

          return (
            <React.Fragment key={route.key}>
              {addSpacer && <View style={{ width: notchWidth }} />}
              <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.75}
                style={styles.tab}
              >
                <Ionicons
                  name={meta.icon}
                  size={24}
                  color={isFocused ? active : inactive}
                />
                <Text
                  style={[
                    styles.label,
                    { color: isFocused ? "#FFFFFF" : inactive },
                  ]}
                >
                  {meta.label}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </View>

      {/* soft top highlight */}
      <View pointerEvents="none" style={styles.topGlow} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
  },
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 86,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    paddingTop: 18,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingVertical: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
  },
  centerBtn: {
    position: "absolute",
    alignSelf: "center",
    top: -18,
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 6,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: Platform.OS === "android" ? 16 : 0,
    zIndex: 10,
  },
  notch: {
    position: "absolute",
    alignSelf: "center",
    zIndex: 1,
  },
  notchInner: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  topGlow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
});
