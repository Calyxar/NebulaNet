import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type CameraViewWithRecording = CameraView & {
  recordAsync?: (options?: {
    maxDuration?: number;
  }) => Promise<{ uri: string }>;
  stopRecording?: () => void;
};

export default function CreateVideo() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraViewWithRecording | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission?.granted, requestPermission]);

  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Camera permission is required.</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const startRecording = async () => {
    try {
      if (!cameraRef.current?.recordAsync) {
        // fallback if recordAsync isn't available in this SDK
        router.back();
        return;
      }

      setIsRecording(true);

      const video = await cameraRef.current.recordAsync({
        maxDuration: 60,
      });

      setIsRecording(false);

      if (!video?.uri) return;

      router.push({
        pathname: "/create/post",
        params: { videoUri: video.uri },
      });
    } catch (e) {
      setIsRecording(false);
      console.log(e);
    }
  };

  const stopRecording = async () => {
    try {
      cameraRef.current?.stopRecording?.();
    } catch {}
  };

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef as any} style={styles.camera} facing="back" />

      <View style={styles.controls}>
        {!isRecording ? (
          <TouchableOpacity
            style={[styles.record, styles.recordIdle]}
            onPress={startRecording}
          >
            <Text style={styles.btnText}>Record</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.record, styles.recordLive]}
            onPress={stopRecording}
          >
            <Text style={styles.btnText}>Stop</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  controls: {
    position: "absolute",
    bottom: 40,
    width: "100%",
    alignItems: "center",
  },
  record: { paddingVertical: 14, paddingHorizontal: 22, borderRadius: 999 },
  recordIdle: { backgroundColor: "#2563eb" },
  recordLive: { backgroundColor: "#dc2626" },
  btnText: { color: "#fff", fontWeight: "700" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  text: { color: "#111", marginBottom: 12 },
  btn: { backgroundColor: "#2563eb", padding: 12, borderRadius: 10 },
});
