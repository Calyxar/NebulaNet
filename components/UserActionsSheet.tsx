// components/UserActionsSheet.tsx — BottomSheetModal version ✅ dark mode
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type UserActionsSheetRef = {
  snapToIndex: (index: number) => void;
  close: () => void;
};

type Props = {
  username?: string;
  onMessage?: () => void;
  onCopyLink?: () => void;
  onMute?: () => void;
  isMuted?: boolean;
  removeLabel?: string;
  onRemove?: () => void;
  blockLabel?: string;
  onBlock?: () => void;
  hideBlock?: boolean;
  onReport?: () => void;
};

const UserActionsSheet = forwardRef<UserActionsSheetRef, Props>(
  (
    {
      username,
      onMessage,
      onCopyLink,
      onMute,
      isMuted = false,
      removeLabel = "Remove follower",
      onRemove,
      blockLabel = "Block",
      onBlock,
      hideBlock = false,
      onReport,
    },
    ref,
  ) => {
    const { colors, isDark } = useTheme();
    const modalRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ["60%"], []);

    useImperativeHandle(
      ref,
      () => ({
        snapToIndex: (_index: number) => {
          modalRef.current?.present();
        },
        close: () => {
          modalRef.current?.dismiss();
        },
      }),
      [],
    );

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
      <BottomSheetModal
        ref={modalRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
        backgroundStyle={{ backgroundColor: colors.card }}
      >
        <BottomSheetView style={styles.sheet}>
          <Text
            style={[styles.title, { color: colors.text }]}
            numberOfLines={1}
          >
            @{username || "user"}
          </Text>

          {!!onMessage && (
            <TouchableOpacity
              style={[styles.item, { borderBottomColor: colors.border }]}
              activeOpacity={0.85}
              onPress={onMessage}
            >
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: colors.primary + "18" },
                ]}
              >
                <Ionicons
                  name="chatbubble-outline"
                  size={18}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.itemText, { color: colors.text }]}>
                Message @{username}
              </Text>
            </TouchableOpacity>
          )}

          {!!onCopyLink && (
            <TouchableOpacity
              style={[styles.item, { borderBottomColor: colors.border }]}
              activeOpacity={0.85}
              onPress={onCopyLink}
            >
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: colors.primary + "18" },
                ]}
              >
                <Ionicons
                  name="link-outline"
                  size={18}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.itemText, { color: colors.text }]}>
                Copy profile link
              </Text>
            </TouchableOpacity>
          )}

          {!!onMute && (
            <TouchableOpacity
              style={[styles.item, { borderBottomColor: colors.border }]}
              activeOpacity={0.85}
              onPress={onMute}
            >
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: colors.primary + "18" },
                ]}
              >
                <Ionicons
                  name={
                    isMuted ? "volume-medium-outline" : "volume-mute-outline"
                  }
                  size={18}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.itemText, { color: colors.text }]}>
                {isMuted ? `Unmute @${username}` : `Mute @${username}`}
              </Text>
            </TouchableOpacity>
          )}

          {!!onRemove && (
            <TouchableOpacity
              style={[styles.item, { borderBottomColor: colors.border }]}
              activeOpacity={0.85}
              onPress={onRemove}
            >
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: colors.primary + "18" },
                ]}
              >
                <Ionicons
                  name="person-remove-outline"
                  size={18}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.itemText, { color: colors.text }]}>
                {removeLabel}
              </Text>
            </TouchableOpacity>
          )}

          {!hideBlock && !!onBlock && (
            <TouchableOpacity
              style={[styles.item, { borderBottomColor: colors.border }]}
              activeOpacity={0.85}
              onPress={onBlock}
            >
              <View style={[styles.iconWrap, { backgroundColor: "#EF444420" }]}>
                <Ionicons name="ban-outline" size={18} color="#EF4444" />
              </View>
              <Text style={[styles.itemText, { color: "#EF4444" }]}>
                {blockLabel} @{username}
              </Text>
            </TouchableOpacity>
          )}

          {!!onReport && (
            <TouchableOpacity
              style={[styles.item, { borderBottomColor: colors.border }]}
              activeOpacity={0.85}
              onPress={onReport}
            >
              <View style={[styles.iconWrap, { backgroundColor: "#EF444420" }]}>
                <Ionicons name="flag-outline" size={18} color="#EF4444" />
              </View>
              <Text style={[styles.itemText, { color: "#EF4444" }]}>
                Report @{username}
              </Text>
            </TouchableOpacity>
          )}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={[styles.item, styles.cancel]}>
            <Text style={[styles.cancelText, { color: colors.textTertiary }]}>
              Swipe down to close
            </Text>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

UserActionsSheet.displayName = "UserActionsSheet";
export default UserActionsSheet;

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 32,
  },
  title: {
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 10,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    borderRadius: 14,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    fontSize: 14,
    fontWeight: "900",
  },
  divider: {
    height: 1,
    marginVertical: 6,
  },
  cancel: {
    justifyContent: "center",
  },
  cancelText: {
    textAlign: "center",
    fontWeight: "800",
  },
});
