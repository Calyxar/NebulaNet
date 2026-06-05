// app/(tabs)/_layout.tsx ✅
import CurvedTabBar from "@/components/navigation/CurvedTabBar";
import { useTheme } from "@/providers/ThemeProvider";
import { Tabs } from "expo-router";

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CurvedTabBar {...props} />}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="explore" options={{ title: "Explore" }} />
      <Tabs.Screen name="create" options={{ title: "Create" }} />
      <Tabs.Screen name="chat" options={{ title: "Chat" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      {/* notifications is accessed via the bell icon in AppHeader, not a tab */}
      <Tabs.Screen
        name="notifications"
        options={{ href: null }} // hides it from the tab bar entirely
      />
    </Tabs>
  );
}
