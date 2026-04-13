// components/UserActionsSheet.tsx — DEBUG VERSION

import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import React, { forwardRef, useCallback, useEffect, useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type UserActionsSheetRef = BottomSheet;

type Props = {
  username?: string;
  onMessage?: () => void;
  onCopyLink?: () => void;
  onShare?: () => void;
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
      onShare,
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
    const snapPoints = useMemo(() => ["65%"], []);

    // DEBUG: Log what props we received
    useEffect(() => {
      console.log("=== UserActionsSheet Props ===");
      console.log("username:", username);
      console.log("onMessage:", !!onMessage);
      console.log("onCopyLink:", !!onCopyLink);
      console.log("onShare:", !!onShare);
      console.log("onMute:", !!onMute);
      console.log("isMuted:", isMuted);
      console.log("onRemove:", !!onRemove);
      console.log("onBlock:", !!onBlock);
      console.log("hideBlock:", hideBlock);
      console.log("onReport:", !!onReport);
      console.log("===============================");
    }, [
      username,
      onMessage,
      onCopyLink,
      onShare,
      onMute,
      isMuted,
      onRemove,
      onBlock,
      hideBlock,
      onReport,
    ]);

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
        handleIndicatorStyle={{ backgroundColor: "#D1D5DB" }}
        backgroundStyle={{ backgroundColor: "#FFFFFF" }}
      >
        <View style={styles.sheet}>
          <Text style={styles.title} numberOfLines={1}>
            @{username || "user"}
          </Text>

          {/* Message */}
          {!!onMessage && (
            <TouchableOpacity
              style={styles.item}
              activeOpacity={0.85}
              onPress={onMessage}
            >
              <View style={styles.iconWrap}>
                <Ionicons name="chatbubble-outline" size={18} color="#7C3AED" />
              </View>
              <Text style={styles.itemText}>Message @{username}</Text>
            </TouchableOpacity>
          )}

          {/* Copy Link */}
          {!!onCopyLink && (
            <TouchableOpacity
              style={styles.item}
              activeOpacity={0.85}
              onPress={onCopyLink}
            >
              <View style={styles.iconWrap}>
                <Ionicons name="link-outline" size={18} color="#7C3AED" />
              </View>
              <Text style={styles.itemText}>Copy profile link</Text>
            </TouchableOpacity>
          )}

          {/* Share */}
          {!!onShare && (
            <TouchableOpacity
              style={styles.item}
              activeOpacity={0.85}
              onPress={onShare}
            >
              <View style={styles.iconWrap}>
                <Ionicons name="share-outline" size={18} color="#7C3AED" />
              </View>
              <Text style={styles.itemText}>Share profile</Text>
            </TouchableOpacity>
          )}

          {/* Mute */}
          {!!onMute && (
            <TouchableOpacity
              style={styles.item}
              activeOpacity={0.85}
              onPress={onMute}
            >
              <View style={styles.iconWrap}>
                <Ionicons
                  name={
                    isMuted ? "volume-medium-outline" : "volume-mute-outline"
                  }
                  size={18}
                  color="#7C3AED"
                />
              </View>
              <Text style={styles.itemText}>
                {isMuted ? `Unmute @${username}` : `Mute @${username}`}
              </Text>
            </TouchableOpacity>
          )}

          {/* Remove follower */}
          {!!onRemove && (
            <TouchableOpacity
              style={styles.item}
              activeOpacity={0.85}
              onPress={onRemove}
            >
              <View style={styles.iconWrap}>
                <Ionicons
                  name="person-remove-outline"
                  size={18}
                  color="#7C3AED"
                />
              </View>
              <Text style={styles.itemText}>{removeLabel}</Text>
            </TouchableOpacity>
          )}

          {/* Block */}
          {!hideBlock && !!onBlock && (
            <TouchableOpacity
              style={styles.item}
              activeOpacity={0.85}
              onPress={onBlock}
            >
              <View style={[styles.iconWrap, { backgroundColor: "#FEE2E2" }]}>
                <Ionicons name="ban-outline" size={18} color="#EF4444" />
              </View>
              <Text style={[styles.itemText, { color: "#EF4444" }]}>
                {blockLabel} @{username}
              </Text>
            </TouchableOpacity>
          )}

          {/* Report */}
          {!!onReport && (
            <TouchableOpacity
              style={styles.item}
              activeOpacity={0.85}
              onPress={onReport}
            >
              <View style={[styles.iconWrap, { backgroundColor: "#FEE2E2" }]}>
                <Ionicons name="flag-outline" size={18} color="#EF4444" />
              </View>
              <Text style={[styles.itemText, { color: "#EF4444" }]}>
                Report @{username}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.divider} />

          <TouchableOpacity
            style={[styles.item, styles.cancel]}
            activeOpacity={0.85}
          >
            <Text style={styles.cancelText}>Swipe down to close</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    );
  },
);

UserActionsSheet.displayName = "UserActionsSheet";

export default UserActionsSheet;

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
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
    backgroundColor: "#EDEBFF",
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
  },
  divider: {
    height: 1,
    backgroundColor: "#EEF2FF",
    marginVertical: 6,
  },
  cancel: {
    justifyContent: "center",
  },
  cancelText: {
    textAlign: "center",
    fontWeight: "800",
    color: "#6B7280",
  },
});
