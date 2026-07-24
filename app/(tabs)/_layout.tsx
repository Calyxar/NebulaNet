// app/(tabs)/_layout.tsx ✅ FIXED
// ✅ FIXED: added tabBarIcon to every Tabs.Screen — this was never set
//           anywhere, so CurvedTabBar's per-tab renderTab() had nothing
//           to call and was falling through to its "ellipse-outline"
//           empty-circle fallback for every single tab.
// ✅ FIXED: "create" tab now uses `href: null` (same pattern already
//           used for "notifications") so it's excluded from the tab bar
//           entirely. CurvedTabBar already renders its own raised "+"
//           button that navigates to /create/post — having "create" ALSO
//           registered as a normal tab route was giving it a second,
//           competing slot and throwing off the left/right split math
//           (midpoint = Math.ceil(routes.length / 2)).
import CurvedTabBar from "@/components/navigation/CurvedTabBar";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CurvedTabBar {...props} />}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "compass" : "compass-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        // ✅ Hidden from the tab bar — the raised "+" button in
        // CurvedTabBar already navigates to /create/post, so this
        // screen doesn't need its own tab slot.
        options={{ href: null }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "chatbubble" : "chatbubble-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
      {/* notifications is accessed via the bell icon in AppHeader, not a tab */}
      <Tabs.Screen
        name="notifications"
        options={{ href: null }} // hides it from the tab bar entirely
      />
    </Tabs>
  );
}
