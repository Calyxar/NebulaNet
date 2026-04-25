// components/ShareSheet.tsx — ✅ FIXED: added explicit "Send via text" option

import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import * as Clipboard from "expo-clipboard";
import React, { forwardRef, useCallback, useMemo } from "react";
import {
  Alert,
  Linking,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export type ShareSheetRef = BottomSheet;

type ShareOption = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  onPress: () => void;
};

type Props = {
  title?: string;
  url: string;
  text?: string;
  shareMessage?: string;
};

const ShareSheet = forwardRef<ShareSheetRef, Props>(
  ({ title = "Share", url, text, shareMessage }, ref) => {
    const { colors } = useTheme();
    const snapPoints = useMemo(() => ["42%"], []);

    const handleCopyLink = async () => {
      await Clipboard.setStringAsync(url);
      (ref as any)?.current?.close();
      Alert.alert("Copied", "Link copied to clipboard");
    };

    const handleSendText = async () => {
      // sms: URI opens the native Messages app with the link pre-filled
      const message = shareMessage || text || url;
      const smsBody = encodeURIComponent(`${message}\n${url}`);
      const smsUrl =
        Platform.OS === "ios" ? `sms:&body=${smsBody}` : `sms:?body=${smsBody}`;

      const canOpen = await Linking.canOpenURL(smsUrl);
      if (canOpen) {
        await Linking.openURL(smsUrl);
      } else {
        // Fallback to native share sheet which includes Messages
        await Share.share({
          message: Platform.OS === "ios" ? message : `${message}\n\n${url}`,
          url: Platform.OS === "ios" ? url : undefined,
        });
      }
      (ref as any)?.current?.close();
    };

    const handleShare = async () => {
      try {
        const message = shareMessage || text || url;
        await Share.share({
          message: Platform.OS === "ios" ? message : `${message}\n\n${url}`,
          url: Platform.OS === "ios" ? url : undefined,
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    };

    const options: ShareOption[] = [
      {
        id: "copy",
        label: "Copy link",
        icon: "link-outline",
        color: colors.primary,
        onPress: handleCopyLink,
      },
      {
        id: "text",
        label: "Send via text message",
        icon: "chatbubble-ellipses-outline",
        color: "#34C759",
        onPress: handleSendText,
      },
      {
        id: "share",
        label: "More sharing options...",
        icon: "share-social-outline",
        color: colors.primary,
        onPress: handleShare,
      },
    ];

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior="close"
        />
      ),
      [],
    );

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
        backgroundStyle={{ backgroundColor: colors.card }}
      >
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

          {options.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.item}
              activeOpacity={0.85}
              onPress={option.onPress}
            >
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: `${option.color}18` },
                ]}
              >
                <Ionicons
                  name={option.icon}
                  size={20}
                  color={option.color || colors.primary}
                />
              </View>
              <Text style={[styles.itemText, { color: colors.text }]}>
                {option.label}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          ))}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.cancel}
            activeOpacity={0.85}
            onPress={() => (ref as any)?.current?.close()}
          >
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    );
  },
);

ShareSheet.displayName = "ShareSheet";
export default ShareSheet;

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 16,
    textAlign: "center",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  cancel: {
    paddingVertical: 13,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "800",
  },
});
