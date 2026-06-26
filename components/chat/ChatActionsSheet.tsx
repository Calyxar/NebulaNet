// components/chat/ChatActionsSheet.tsx — NEW
// Matches UserActionsSheet's exact visual pattern (BottomSheetModal,
// optional-prop-driven rows, destructive items in red) for consistency
// across the app, scoped to what a DM conversation screen's "..." menu
// actually needs: view profile, mute, block, report, delete conversation.

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

export type ChatActionsSheetRef = {
  present: () => void;
  close: () => void;
};

type Props = {
  username?: string;
  onViewProfile?: () => void;
  onMute?: () => void;
  isMuted?: boolean;
  onBlock?: () => void;
  onReport?: () => void;
  onDeleteConversation?: () => void;
};

const ChatActionsSheet = forwardRef<ChatActionsSheetRef, Props>(
  (
    {
      username,
      onViewProfile,
      onMute,
      isMuted = false,
      onBlock,
      onReport,
      onDeleteConversation,
    },
    ref,
  ) => {
    const { colors } = useTheme();
    const modalRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ["55%"], []);

    useImperativeHandle(
      ref,
      () => ({
        present: () => modalRef.current?.present(),
        close: () => modalRef.current?.dismiss(),
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
            Conversation with @{username || "user"}
          </Text>

          {!!onViewProfile && (
            <TouchableOpacity
              style={[styles.item, { borderBottomColor: colors.border }]}
              activeOpacity={0.85}
              onPress={onViewProfile}
            >
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: colors.primary + "18" },
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.itemText, { color: colors.text }]}>
                View profile
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
                {isMuted ? "Unmute notifications" : "Mute notifications"}
              </Text>
            </TouchableOpacity>
          )}

          {!!onBlock && (
            <TouchableOpacity
              style={[styles.item, { borderBottomColor: colors.border }]}
              activeOpacity={0.85}
              onPress={onBlock}
            >
              <View style={[styles.iconWrap, { backgroundColor: "#EF444420" }]}>
                <Ionicons name="ban-outline" size={18} color="#EF4444" />
              </View>
              <Text style={[styles.itemText, { color: "#EF4444" }]}>
                Block @{username}
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

          {!!onDeleteConversation && (
            <TouchableOpacity
              style={[styles.item, { borderBottomColor: colors.border }]}
              activeOpacity={0.85}
              onPress={onDeleteConversation}
            >
              <View style={[styles.iconWrap, { backgroundColor: "#EF444420" }]}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </View>
              <Text style={[styles.itemText, { color: "#EF4444" }]}>
                Delete conversation
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

ChatActionsSheet.displayName = "ChatActionsSheet";
export default ChatActionsSheet;

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
