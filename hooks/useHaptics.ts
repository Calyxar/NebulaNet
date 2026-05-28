import { useSettings } from "@/hooks/useSettings";
import * as Haptics from "expo-haptics";

export function useHaptics() {
  const { settings } = useSettings();
  const enabled = settings?.preferences?.haptics_enabled ?? true;

  const impact = (style = Haptics.ImpactFeedbackStyle.Light) => {
    if (!enabled) return;
    Haptics.impactAsync(style);
  };

  const notification = (type = Haptics.NotificationFeedbackType.Success) => {
    if (!enabled) return;
    Haptics.notificationAsync(type);
  };

  const selection = () => {
    if (!enabled) return;
    Haptics.selectionAsync();
  };

  return { impact, notification, selection, enabled };
}
