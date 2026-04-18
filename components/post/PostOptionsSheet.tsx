// components/post/PostOptionsSheet.tsx
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef } from "react";
import {
    Animated,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface PostOption {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface PostOptionsSheetProps {
  visible: boolean;
  onClose: () => void;
  options: PostOption[];
}

export default function PostOptionsSheet({
  visible,
  onClose,
  options,
}: PostOptionsSheetProps) {
  const { colors, isDark } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(300)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          damping: 22,
          stiffness: 260,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 300,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleOptionPress = useCallback(
    (option: PostOption) => {
      onClose();
      setTimeout(option.onPress, 180);
    },
    [onClose],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[styles.sheetWrapper, { transform: [{ translateY }] }]}
        pointerEvents="box-none"
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              paddingBottom: bottom > 0 ? bottom : 20,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <Text style={[styles.title, { color: colors.text }]}>
            Post Options
          </Text>

          <View style={styles.optionsList}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={option.label}
                style={[
                  styles.optionRow,
                  index !== options.length - 1 && [
                    styles.optionBorder,
                    { borderBottomColor: colors.border },
                  ],
                ]}
                onPress={() => handleOptionPress(option)}
                disabled={option.disabled}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.iconCircle,
                    {
                      backgroundColor: option.destructive
                        ? "#FF3B3015"
                        : colors.primary + "15",
                    },
                  ]}
                >
                  <Ionicons
                    name={option.icon}
                    size={19}
                    color={option.destructive ? "#FF3B30" : colors.primary}
                  />
                </View>
                <Text
                  style={[
                    styles.optionLabel,
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
                  size={16}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.cancelBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={[styles.cancelLabel, { color: colors.text }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheetWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 18,
  },
  optionsList: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 14,
  },
  optionBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  cancelBtn: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
  },
  cancelLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
});
