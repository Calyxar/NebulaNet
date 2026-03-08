// app/create/video.tsx — REDESIGNED ✅
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type CameraViewWithRecording = CameraView & {
  recordAsync?: (options?: {
    maxDuration?: number;
  }) => Promise<{ uri: string }>;
  stopRecording?: () => void;
};

export default function CreateVideoScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraViewWithRecording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [facing, setFacing] = useState<"front" | "back">("back");
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission?.granted, requestPermission]);

  useEffect(() => {
    if (isRecording) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const startRecording = async () => {
    try {
      if (!cameraRef.current?.recordAsync) {
        router.back();
        return;
      }
      setIsRecording(true);
      const video = await cameraRef.current.recordAsync({ maxDuration: 60 });
      setIsRecording(false);
      if (!video?.uri) return;
      router.push({
        pathname: "/create/post",
        params: { videoUri: video.uri },
      });
    } catch {
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    try {
      cameraRef.current?.stopRecording?.();
    } catch {}
  };

  if (!permission?.granted) {
    return (
      <View style={styles.permContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <Text style={styles.permTitle}>Camera access needed</Text>
        <Text style={styles.permSub}>
          Allow camera access to record videos for your posts.
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Allow Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.permCancel}
          onPress={() => router.back()}
        >
          <Text style={styles.permCancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Camera */}
      <CameraView
        ref={cameraRef as any}
        style={styles.camera}
        facing={facing}
      />

      {/* Top bar */}
      <SafeAreaView style={styles.topBar}>
        <TouchableOpacity
          style={styles.topBtn}
          onPress={() => router.back()}
          disabled={isRecording}
        >
          <Text style={styles.topBtnText}>Cancel</Text>
        </TouchableOpacity>

        {isRecording && (
          <View style={styles.timerPill}>
            <View style={styles.recDot} />
            <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.topBtn}
          onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
          disabled={isRecording}
        >
          <Text style={[styles.topBtnText, isRecording && { opacity: 0.3 }]}>
            Flip
          </Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Bottom controls */}
      <View style={styles.controls}>
        <Text style={styles.hint}>
          {isRecording ? "Tap to stop" : "Tap to record · Max 60s"}
        </Text>

        <TouchableOpacity
          style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
          onPress={isRecording ? stopRecording : startRecording}
          activeOpacity={0.85}
        >
          <View
            style={[
              styles.recordInner,
              isRecording && styles.recordInnerActive,
            ]}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { ...StyleSheet.absoluteFillObject },

  permContainer: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  permTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 10,
    textAlign: "center",
  },
  permSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 32,
  },
  permBtn: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 999,
    marginBottom: 12,
  },
  permBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  permCancel: { paddingVertical: 10 },
  permCancelText: { color: "rgba(255,255,255,0.5)", fontSize: 15 },

  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  topBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  topBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  timerText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  controls: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 16,
  },
  hint: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "600",
  },
  recordBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  recordBtnActive: {
    borderColor: "#EF4444",
  },
  recordInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
  },
  recordInnerActive: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#EF4444",
  },
});
