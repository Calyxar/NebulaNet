// components/ReportSheet.tsx

import { useAuth } from "@/hooks/useAuth";
import { createReport, type ReportReason } from "@/lib/firestore/reports";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import {
    BottomSheetBackdrop,
    BottomSheetModal,
    BottomSheetView,
} from "@gorhom/bottom-sheet";
import React, { forwardRef, useCallback, useMemo } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity } from "react-native";

export type ReportSheetRef = BottomSheetModal;

type ReportType = "user" | "post" | "comment" | "community";

type Props = {
  type: ReportType;
  targetId: string;
};

const ReportSheet = forwardRef<ReportSheetRef, Props>(
  ({ type, targetId }, ref) => {
    const { colors } = useTheme();
    const { user } = useAuth();

    const snapPoints = useMemo(() => ["55%"], []);

    const dismiss = () => (ref as any)?.current?.dismiss();

    const submitReport = async (reason: ReportReason) => {
      try {
        if (!user?.uid) {
          Alert.alert("Error", "You must be logged in.");
          return;
        }

        await createReport({
          reporter_id: user.uid,
          reported_id: targetId,
          type,
          reason,
        });

        dismiss();

        Alert.alert(
          "Report submitted",
          "Thanks for helping keep NebulaNet safe.",
        );
      } catch (error: any) {
        console.error("Report failed:", error);

        Alert.alert("Report failed", error?.message ?? "Something went wrong.");
      }
    };

    const reasons = [
      {
        id: "spam",
        label: "Spam",
        icon: "megaphone-outline",
      },
      {
        id: "harassment",
        label: "Harassment or bullying",
        icon: "warning-outline",
      },
      {
        id: "hate_speech",
        label: "Hateful or abusive content",
        icon: "alert-circle-outline",
      },
      {
        id: "sexual_content",
        label: "Sexual content",
        icon: "eye-off-outline",
      },
      {
        id: "other",
        label: "Something else",
        icon: "ellipsis-horizontal-circle-outline",
      },
    ] as const;

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
        handleIndicatorStyle={{
          backgroundColor: colors.border,
        }}
        backgroundStyle={{
          backgroundColor: colors.card,
        }}
      >
        <BottomSheetView
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
            },
          ]}
        >
          <Text
            style={[
              styles.title,
              {
                color: colors.text,
              },
            ]}
          >
            Report {type}
          </Text>

          {reasons.map((reason) => (
            <TouchableOpacity
              key={reason.id}
              style={styles.item}
              activeOpacity={0.85}
              onPress={() => submitReport(reason.id as ReportReason)}
            >
              <Ionicons
                name={reason.icon as any}
                size={22}
                color={colors.primary}
              />

              <Text
                style={[
                  styles.text,
                  {
                    color: colors.text,
                  },
                ]}
              >
                {reason.label}
              </Text>

              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.cancel} onPress={dismiss}>
            <Text
              style={[
                styles.cancelText,
                {
                  color: colors.textSecondary,
                },
              ]}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

ReportSheet.displayName = "ReportSheet";

export default ReportSheet;

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 30,
  },

  title: {
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 18,
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
  },

  text: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
  },

  cancel: {
    marginTop: 15,
    alignItems: "center",
    paddingVertical: 14,
  },

  cancelText: {
    fontSize: 15,
    fontWeight: "800",
  },
});
