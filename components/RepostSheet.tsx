// components/RepostSheet.tsx — Custom themed repost options

import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import React, { forwardRef, useCallback, useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type RepostSheetRef = BottomSheet;

type Props = {
  /** Is this post already reposted? */
  isReposted?: boolean;

  /** Simple repost action */
  onRepost: () => void;

  /** Quote repost (repost with comment) */
  onQuoteRepost?: () => void;

  /** Undo repost */
  onUndoRepost?: () => void;
};

const RepostSheet = forwardRef<RepostSheetRef, Props>(
  ({ isReposted = false, onRepost, onQuoteRepost, onUndoRepost }, ref) => {
    const { colors } = useTheme();
    const snapPoints = useMemo(() => ["35%"], []);

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

    const handleRepost = () => {
      onRepost();
      (ref as any)?.current?.close();
    };

    const handleQuoteRepost = () => {
      if (onQuoteRepost) onQuoteRepost();
      (ref as any)?.current?.close();
    };

    const handleUndoRepost = () => {
      if (onUndoRepost) onUndoRepost();
      (ref as any)?.current?.close();
    };

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
          <Text style={[styles.title, { color: colors.text }]}>
            {isReposted ? "Repost Options" : "Repost"}
          </Text>

          {!isReposted ? (
            <>
              {/* Simple Repost */}
              <TouchableOpacity
                style={styles.item}
                activeOpacity={0.85}
                onPress={handleRepost}
              >
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: `${colors.primary}18` },
                  ]}
                >
                  <Ionicons
                    name="repeat-outline"
                    size={22}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.itemContent}>
                  <Text style={[styles.itemText, { color: colors.text }]}>
                    Repost
                  </Text>
                  <Text
                    style={[
                      styles.itemDescription,
                      { color: colors.textTertiary },
                    ]}
                  >
                    Instantly share to your followers
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Quote Repost */}
              {onQuoteRepost && (
                <TouchableOpacity
                  style={styles.item}
                  activeOpacity={0.85}
                  onPress={handleQuoteRepost}
                >
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: `${colors.primary}18` },
                    ]}
                  >
                    <Ionicons
                      name="create-outline"
                      size={22}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.itemContent}>
                    <Text style={[styles.itemText, { color: colors.text }]}>
                      Quote Repost
                    </Text>
                    <Text
                      style={[
                        styles.itemDescription,
                        { color: colors.textTertiary },
                      ]}
                    >
                      Add your thoughts before reposting
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </>
          ) : (
            /* Undo Repost */
            <TouchableOpacity
              style={styles.item}
              activeOpacity={0.85}
              onPress={handleUndoRepost}
            >
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: `${colors.like}18` },
                ]}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={22}
                  color={colors.like}
                />
              </View>
              <View style={styles.itemContent}>
                <Text style={[styles.itemText, { color: colors.text }]}>
                  Undo Repost
                </Text>
                <Text
                  style={[
                    styles.itemDescription,
                    { color: colors.textTertiary },
                  ]}
                >
                  Remove this from your profile
                </Text>
              </View>
            </TouchableOpacity>
          )}

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

RepostSheet.displayName = "RepostSheet";

export default RepostSheet;

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
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  itemContent: {
    flex: 1,
  },
  itemText: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  cancel: {
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "800",
  },
});
