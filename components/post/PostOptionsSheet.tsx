// components/post/PostOptionsSheet.tsx
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import React, { forwardRef, useCallback, useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type PostOptionsSheetRef = BottomSheetModal;

export interface PostOption {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface Props {
  options: PostOption[];
}

const PostOptionsSheet = forwardRef<PostOptionsSheetRef, Props>(
  ({ options }, ref) => {
    const { colors } = useTheme();

    const snapPoints = useMemo(() => ["55%"], []);

    const dismiss = () => (ref as any)?.current?.dismiss();

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
        ref={ref}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
        backgroundStyle={{ backgroundColor: colors.card }}
      >
        <BottomSheetView
          style={[styles.sheet, { backgroundColor: colors.card }]}
        >
          <Text style={[styles.title, { color: colors.text }]}>
            Post Options
          </Text>

          {options.map((option) => (
            <TouchableOpacity
              key={option.label}
              style={styles.item}
              activeOpacity={0.85}
              disabled={option.disabled}
              onPress={() => {
                dismiss();
                setTimeout(option.onPress, 150);
              }}
            >
              <View
                style={[
                  styles.iconWrap,
                  {
                    backgroundColor: option.destructive
                      ? "#FF3B3018"
                      : `${colors.primary}18`,
                  },
                ]}
              >
                <Ionicons
                  name={option.icon}
                  size={20}
                  color={option.destructive ? "#FF3B30" : colors.primary}
                />
              </View>

              <Text
                style={[
                  styles.itemText,
                  {
                    color: option.destructive ? "#FF3B30" : colors.text,
                    opacity: option.disabled ? 0.4 : 1,
                  },
                ]}
              >
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
            onPress={dismiss}
          >
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

PostOptionsSheet.displayName = "PostOptionsSheet";

export default PostOptionsSheet;

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 32,
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
