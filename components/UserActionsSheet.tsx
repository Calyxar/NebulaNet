import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import React, { forwardRef, useCallback, useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type UserActionsSheetRef = BottomSheet;

type Props = {
  username?: string;

  /** Primary action (Remove / Unblock / Cancel Request) */
  removeLabel?: string;
  onRemove?: () => void;

  /** Secondary action (Block) */
  onBlock?: () => void;
};

const UserActionsSheet = forwardRef<UserActionsSheetRef, Props>(
  ({ username, removeLabel = "Remove", onRemove, onBlock }, ref) => {
    const snapPoints = useMemo(() => ["28%"], []);

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

          {/* Primary action */}
          {onRemove && (
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

          {/* Secondary action */}
          {onBlock && (
            <TouchableOpacity
              style={styles.item}
              activeOpacity={0.85}
              onPress={onBlock}
            >
              <View style={styles.iconWrap}>
                <Ionicons name="ban-outline" size={18} color="#7C3AED" />
              </View>
              <Text style={styles.itemText}>Block</Text>
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

UserActionsSheet.displayName = "UserActionsSheet"; // ✅ fixes react/display-name

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
    paddingVertical: 12,
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
