// components/media/VideoPlayer.tsx
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import * as VideoThumbnails from "expo-video-thumbnails";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

interface ControlsProps {
  playing: boolean;
  pos: number;
  dur: number;
  isMuted: boolean;
  speed: number;
  showSpeedMenu: boolean;
  isZoom: boolean;
  bottomPad: number;
  primaryColor: string;
  onToggle: () => void;
  onSeekComplete: (v: number) => void;
  onSlidingStart: () => void;
  onMute: () => void;
  onSpeedMenuToggle: () => void;
  onSpeedSelect: (s: number) => void;
  onZoomToggle: () => void;
}

function Controls({
  playing,
  pos,
  dur,
  isMuted,
  speed,
  showSpeedMenu,
  isZoom,
  bottomPad,
  primaryColor,
  onToggle,
  onSeekComplete,
  onSlidingStart,
  onMute,
  onSpeedMenuToggle,
  onSpeedSelect,
  onZoomToggle,
}: ControlsProps) {
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <View style={styles.controlsOverlay}>
      <TouchableOpacity
        style={styles.playButton}
        onPress={onToggle}
        activeOpacity={0.85}
      >
        <Ionicons name={playing ? "pause" : "play"} size={36} color="#fff" />
      </TouchableOpacity>

      <View style={[styles.bottomControls, { paddingBottom: bottomPad }]}>
        <View style={styles.progressRow}>
          <Text style={styles.timeText}>{formatTime(pos)}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            value={dur > 0 ? pos / dur : 0}
            onSlidingStart={onSlidingStart}
            onSlidingComplete={onSeekComplete}
            minimumTrackTintColor={primaryColor}
            maximumTrackTintColor="rgba(255,255,255,0.3)"
            thumbTintColor={primaryColor}
          />
          <Text style={styles.timeText}>{formatTime(dur)}</Text>
        </View>

        <View style={styles.buttonsRow}>
          <TouchableOpacity
            onPress={onMute}
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

          <TouchableOpacity
            onPress={onSpeedMenuToggle}
            style={[styles.speedBtn, { borderColor: primaryColor }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.speedText, { color: primaryColor }]}>
              {speed}x
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onZoomToggle}
            style={styles.iconBtn}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isZoom ? "contract-outline" : "expand-outline"}
              size={22}
              color="#fff"
            />
          </TouchableOpacity>
        </View>

        {showSpeedMenu && (
          <View style={styles.speedMenu}>
            {SPEEDS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.speedOption,
                  speed === s && { backgroundColor: primaryColor + "44" },
                ]}
                onPress={() => onSpeedSelect(s)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.speedOptionText,
                    speed === s && { color: primaryColor, fontWeight: "800" },
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
}

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
  const insets = useSafeAreaInsets();

  const videoRef = useRef<Video>(null);
  const zoomVideoRef = useRef<Video>(null);

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSlidingRef = useRef(false);
  const lastPositionUpdate = useRef(0);
  const wasPlayingBeforeSeek = useRef(false);
  const speedChangeInProgress = useRef(false);

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [showThumbnail, setShowThumbnail] = useState(!autoPlay);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(
    poster ?? null,
  );

  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);

  const [isMuted, setIsMuted] = useState(false);
  // Use state for speed so Video rate prop updates reactively
  const [speed, setSpeed] = useState(1);
  const [pendingSpeed, setPendingSpeed] = useState<number | null>(null);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState(0);
  const [isZoomPlaying, setIsZoomPlaying] = useState(false);

  // Generate thumbnail from video on mount using expo-video-thumbnails
  useEffect(() => {
    if (thumbnailUri) return;
    let cancelled = false;
    const cleanUri = uri.split("?")[0]; // strip token query string
    (async () => {
      try {
        const { uri: thumb } = await VideoThumbnails.getThumbnailAsync(
          cleanUri,
          {
            time: 0,
            quality: 0.6,
          },
        );
        if (!cancelled) setThumbnailUri(thumb);
      } catch {
        // fallback placeholder will show
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uri]);

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  const onPlaybackStatusUpdate = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) return;
      if (status.durationMillis) setDuration(status.durationMillis / 1000);

      if (!isSlidingRef.current && status.positionMillis !== undefined) {
        const now = Date.now();
        if (now - lastPositionUpdate.current > 250) {
          lastPositionUpdate.current = now;
          setPosition(status.positionMillis / 1000);
        }
      }

      // If a speed change is in progress and video unexpectedly paused, resume it
      if (
        speedChangeInProgress.current &&
        !status.isPlaying &&
        wasPlayingBeforeSeek.current
      ) {
        videoRef.current?.playAsync();
        return;
      }

      setIsPlaying(status.isPlaying);

      if (status.didJustFinish && !status.isLooping) {
        onEnd?.();
        setShowControls(true);
        setShowThumbnail(false);
      }
    },
    [onEnd],
  );

  const onZoomStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setIsZoomPlaying(status.isPlaying);

    if (!isSlidingRef.current && status.positionMillis !== undefined) {
      const now = Date.now();
      if (now - lastPositionUpdate.current > 250) {
        lastPositionUpdate.current = now;
        setZoomPosition(status.positionMillis / 1000);
      }
    }
  }, []);

  const togglePlayPause = async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
      onPause?.();
      setShowControls(true);
    } else {
      setShowThumbnail(false);
      await videoRef.current.playAsync();
      onPlay?.();
      scheduleHide();
    }
  };

  const toggleZoomPlayPause = async () => {
    if (!zoomVideoRef.current) return;
    if (isZoomPlaying) {
      await zoomVideoRef.current.pauseAsync();
    } else {
      await zoomVideoRef.current.playAsync();
      scheduleHide();
    }
  };

  const toggleMute = async () => {
    const newMuted = !isMuted;
    await videoRef.current?.setIsMutedAsync(newMuted);
    await zoomVideoRef.current?.setIsMutedAsync(newMuted);
    setIsMuted(newMuted);
  };

  const handleSlidingStart = () => {
    isSlidingRef.current = true;
    wasPlayingBeforeSeek.current = isPlaying;
    if (isPlaying) videoRef.current?.pauseAsync();
  };

  const handleSeek = async (value: number) => {
    isSlidingRef.current = false;
    const ms = value * duration * 1000;
    await videoRef.current?.setPositionAsync(ms);
    setPosition(value * duration);
    if (wasPlayingBeforeSeek.current) {
      await videoRef.current?.playAsync();
    }
  };

  const handleZoomSlidingStart = () => {
    isSlidingRef.current = true;
    wasPlayingBeforeSeek.current = isZoomPlaying;
    if (isZoomPlaying) zoomVideoRef.current?.pauseAsync();
  };

  const handleZoomSeek = async (value: number) => {
    isSlidingRef.current = false;
    const ms = value * duration * 1000;
    await zoomVideoRef.current?.setPositionAsync(ms);
    setZoomPosition(value * duration);
    if (wasPlayingBeforeSeek.current) {
      await zoomVideoRef.current?.playAsync();
    }
  };

  const handleSpeedSelect = async (s: number) => {
    wasPlayingBeforeSeek.current = isPlaying || isZoomPlaying;
    speedChangeInProgress.current = true;
    // Update rate prop reactively via state — avoids setRateAsync pausing bug
    setSpeed(s);
    setPendingSpeed(s);
    setShowSpeedMenu(false);
    scheduleHide();
    // Give the rate prop time to apply, then force resume if needed
    setTimeout(async () => {
      speedChangeInProgress.current = false;
      if (wasPlayingBeforeSeek.current) {
        await videoRef.current?.playAsync();
        await zoomVideoRef.current?.playAsync();
      }
    }, 300);
  };

  const openZoom = async () => {
    setIsZoomed(true);
    setZoomPosition(position);
    if (isPlaying) await videoRef.current?.pauseAsync();
  };

  const closeZoom = async () => {
    const pos = zoomPosition * 1000;
    if (isZoomPlaying) await zoomVideoRef.current?.pauseAsync();
    setIsZoomed(false);
    await videoRef.current?.setPositionAsync(pos);
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

  return (
    <>
      <View style={[styles.container, style]}>
        <Video
          ref={videoRef}
          source={{ uri }}
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

        {/* Thumbnail — generated from video or passed as poster prop */}
        {showThumbnail && thumbnailUri && (
          <Image
            source={{ uri: thumbnailUri }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        )}

        {/* Fallback when no thumbnail available yet */}
        {showThumbnail && !thumbnailUri && (
          <View style={styles.thumbnailPlaceholder}>
            <Ionicons
              name="play-circle-outline"
              size={64}
              color="rgba(255,255,255,0.8)"
            />
          </View>
        )}

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
              isMuted={isMuted}
              speed={speed}
              showSpeedMenu={showSpeedMenu}
              isZoom={false}
              bottomPad={12}
              primaryColor={colors.primary}
              onToggle={togglePlayPause}
              onSeekComplete={handleSeek}
              onSlidingStart={handleSlidingStart}
              onMute={toggleMute}
              onSpeedMenuToggle={() => setShowSpeedMenu((v) => !v)}
              onSpeedSelect={handleSpeedSelect}
              onZoomToggle={openZoom}
            />
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={isZoomed}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeZoom}
      >
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
            style={[styles.closeBtn, { top: insets.top + 12 }]}
            onPress={closeZoom}
            activeOpacity={0.85}
          >
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            onPress={handleTap}
            activeOpacity={1}
          >
            {showControls && (
              <Controls
                playing={isZoomPlaying}
                pos={zoomPosition}
                dur={duration}
                isMuted={isMuted}
                speed={speed}
                showSpeedMenu={showSpeedMenu}
                isZoom
                bottomPad={insets.bottom + 16}
                primaryColor={colors.primary}
                onToggle={toggleZoomPlayPause}
                onSeekComplete={handleZoomSeek}
                onSlidingStart={handleZoomSlidingStart}
                onMute={toggleMute}
                onSpeedMenuToggle={() => setShowSpeedMenu((v) => !v)}
                onSpeedSelect={handleSpeedSelect}
                onZoomToggle={closeZoom}
              />
            )}
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
  thumbnail: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  thumbnailPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  bottomControls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingTop: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
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
    gap: 14,
    marginBottom: 4,
  },
  iconBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  speedBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  speedText: { fontSize: 13, fontWeight: "700" },
  speedMenu: {
    position: "absolute",
    bottom: 52,
    right: 48,
    backgroundColor: "rgba(0,0,0,0.9)",
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
  closeBtn: {
    position: "absolute",
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
});
