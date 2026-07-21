import LottieView from "lottie-react-native";
import { StyleSheet, View } from "react-native";

export function BirthdayBalloons({
  visible,
  onDone,
}: {
  visible: boolean;
  onDone: () => void;
}) {
  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LottieView
        source={require("@/assets/animations/balloons.json")}
        autoPlay
        loop={false}
        onAnimationFinish={onDone}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
