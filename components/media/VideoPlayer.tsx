// components/media/VideoPlayer.tsx
// ✅ Centered play button, zoom toggle, sound, speed control (0.5x 1x 1.5x 2x)
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface VideoPlayerProps {
  uri: string;
  style?: any;
  autoPlay?: boolean;
  poster?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnd?: () => void;
}

const SPEEDS = [0.5, 1, 1.5, 2];

export default function VideoPlayer({
  uri,
  style,
  autoPlay = false,
  poster,
  onPlay,
  onPause,
  onEnd,
}: VideoPlayerProps) {
  const { colors } = useTheme();
  const videoRef = useRef<Video>(null);
  const zoomVideoRef = useRef<Video>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState(0);
  const [isZoomPlaying, setIsZoomPlaying] = useState(false);

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  const onPlaybackStatusUpdate = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) return;
      if (status.durationMillis) setDuration(status.durationMillis / 1000);
      if (status.positionMillis !== undefined)
        setPosition(status.positionMillis / 1000);
      setIsPlaying(status.isPlaying);
      if (status.didJustFinish && !status.isLooping) {
        onEnd?.();
        setShowControls(true);
      }
    },
    [onEnd],
  );

  const onZoomStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setIsZoomPlaying(status.isPlaying);
    if (status.positionMillis !== undefined)
      setZoomPosition(status.positionMillis / 1000);
  }, []);

  const togglePlayPause = async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
      onPause?.();
      setShowControls(true);
    } else {
      await videoRef.current.playAsync();
      onPlay?.();
      scheduleHide();
    }
  };

  const toggleZoomPlayPause = async () => {
    if (!zoomVideoRef.current) return;
    if (isZoomPlaying) await zoomVideoRef.current.pauseAsync();
    else await zoomVideoRef.current.playAsync();
  };

  const toggleMute = async () => {
    const newMuted = !isMuted;
    await videoRef.current?.setIsMutedAsync(newMuted);
    await zoomVideoRef.current?.setIsMutedAsync(newMuted);
    setIsMuted(newMuted);
  };

  const handleSeek = async (value: number) => {
    const ms = value * duration * 1000;
    await videoRef.current?.setPositionAsync(ms);
  };

  const handleZoomSeek = async (value: number) => {
    const ms = value * duration * 1000;
    await zoomVideoRef.current?.setPositionAsync(ms);
  };

  const setPlaybackSpeed = async (s: number) => {
    await videoRef.current?.setRateAsync(s, true);
    await zoomVideoRef.current?.setRateAsync(s, true);
    setSpeed(s);
    setShowSpeedMenu(false);
    scheduleHide();
  };

  const openZoom = async () => {
    setIsZoomed(true);
    setZoomPosition(position);
    // pause inline player when zooming
    if (isPlaying) await videoRef.current?.pauseAsync();
  };

  const closeZoom = async () => {
    setIsZoomed(false);
    // sync position back
    const pos = zoomPosition * 1000;
    await videoRef.current?.setPositionAsync(pos);
    if (isZoomPlaying) await videoRef.current?.playAsync();
    else await zoomVideoRef.current?.pauseAsync();
  };

  const handleTap = () => {
    if (showSpeedMenu) {
      setShowSpeedMenu(false);
      return;
    }
    setShowControls((v) => {
      if (!v) {
        scheduleHide();
        return true;
      }
      return false;
    });
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const Controls = ({
    playing,
    pos,
    dur,
    onToggle,
    onSeekComplete,
    isZoom = false,
  }: {
    playing: boolean;
    pos: number;
    dur: number;
    onToggle: () => void;
    onSeekComplete: (v: number) => void;
    isZoom?: boolean;
  }) => (
    <View style={styles.controlsOverlay}>
      {/* ✅ Centered play/pause */}
      <TouchableOpacity
        style={[styles.playButton, { backgroundColor: "rgba(0,0,0,0.6)" }]}
        onPress={onToggle}
        activeOpacity={0.85}
      >
        <Ionicons name={playing ? "pause" : "play"} size={36} color="#fff" />
      </TouchableOpacity>

      <View style={styles.bottomControls}>
        {/* Progress row */}
        <View style={styles.progressRow}>
          <Text style={styles.timeText}>{formatTime(pos)}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            value={dur > 0 ? pos / dur : 0}
            onSlidingComplete={onSeekComplete}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor="rgba(255,255,255,0.3)"
            thumbTintColor={colors.primary}
          />
          <Text style={styles.timeText}>{formatTime(dur)}</Text>
        </View>

        {/* Bottom buttons row */}
        <View style={styles.buttonsRow}>
          {/* Mute */}
          <TouchableOpacity
            onPress={toggleMute}
            style={styles.iconBtn}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isMuted ? "volume-mute" : "volume-high"}
              size={22}
              color="#fff"
            />
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          {/* Speed */}
          <TouchableOpacity
            onPress={() => setShowSpeedMenu((v) => !v)}
            style={[styles.speedBtn, { borderColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.speedText, { color: colors.primary }]}>
              {speed}x
            </Text>
          </TouchableOpacity>

          {/* Zoom toggle */}
          <TouchableOpacity
            onPress={isZoom ? closeZoom : openZoom}
            style={styles.iconBtn}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isZoom ? "contract" : "expand"}
              size={22}
              color="#fff"
            />
          </TouchableOpacity>
        </View>

        {/* Speed menu */}
        {showSpeedMenu && (
          <View
            style={[styles.speedMenu, { backgroundColor: "rgba(0,0,0,0.85)" }]}
          >
            {SPEEDS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.speedOption,
                  speed === s && { backgroundColor: colors.primary + "33" },
                ]}
                onPress={() => setPlaybackSpeed(s)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.speedOptionText,
                    speed === s && { color: colors.primary, fontWeight: "800" },
                  ]}
                >
                  {s}x
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  return (
    <>
      <View style={[styles.container, style]}>
        <Video
          ref={videoRef}
          source={{ uri }}
          posterSource={poster ? { uri: poster } : undefined}
          usePoster={!!poster}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={autoPlay}
          isLooping={false}
          isMuted={isMuted}
          rate={speed}
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
          onLoadStart={() => setIsLoading(true)}
          onLoad={() => setIsLoading(false)}
          useNativeControls={false}
        />

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}

        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          onPress={handleTap}
          activeOpacity={1}
        >
          {showControls && !isLoading && (
            <Controls
              playing={isPlaying}
              pos={position}
              dur={duration}
              onToggle={togglePlayPause}
              onSeekComplete={handleSeek}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Zoom modal */}
      <Modal visible={isZoomed} animationType="fade" statusBarTranslucent>
        <View style={styles.modalContainer}>
          <Video
            ref={zoomVideoRef}
            source={{ uri }}
            style={styles.zoomVideo}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={isPlaying}
            isLooping={false}
            isMuted={isMuted}
            rate={speed}
            onPlaybackStatusUpdate={onZoomStatusUpdate}
            useNativeControls={false}
          />
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            onPress={() => {}}
            activeOpacity={1}
          >
            <Controls
              playing={isZoomPlaying}
              pos={zoomPosition}
              dur={duration}
              onToggle={toggleZoomPlayPause}
              onSeekComplete={handleZoomSeek}
              isZoom
            />
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 300,
    backgroundColor: "#000",
    borderRadius: 18,
    overflow: "hidden",
  },
  video: { width: "100%", height: "100%" },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  // ✅ perfectly centered play button
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
  },
  bottomControls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  timeText: {
    fontSize: 11,
    color: "#fff",
    fontWeight: "600",
    minWidth: 36,
    textAlign: "center",
  },
  slider: { flex: 1, marginHorizontal: 6, height: 36 },
  buttonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  speedBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  speedText: { fontSize: 13, fontWeight: "700" },
  speedMenu: {
    position: "absolute",
    bottom: 52,
    right: 12,
    borderRadius: 10,
    overflow: "hidden",
    minWidth: 80,
  },
  speedOption: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  speedOptionText: { fontSize: 14, color: "#fff", fontWeight: "600" },
  modalContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
  },
  zoomVideo: { width: "100%", height: "100%" },
});
