import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import React, { useCallback, useRef, useState } from "react";
import {
    ActivityIndicator,
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
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const onPlaybackStatusUpdate = useCallback(
    (playbackStatus: AVPlaybackStatus) => {
      if (!playbackStatus.isLoaded) return;

      if (playbackStatus.durationMillis) {
        setDuration(playbackStatus.durationMillis / 1000);
      }

      if (playbackStatus.positionMillis !== undefined) {
        setPosition(playbackStatus.positionMillis / 1000);
      }

      setIsPlaying(playbackStatus.isPlaying);

      if (playbackStatus.didJustFinish && !playbackStatus.isLooping) {
        onEnd?.();
        setShowControls(true);
      }
    },
    [onEnd],
  );

  const togglePlayPause = async () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      await videoRef.current.pauseAsync();
      onPause?.();
      setShowControls(true);
    } else {
      await videoRef.current.playAsync();
      onPlay?.();
      setTimeout(() => {
        if (isPlaying) setShowControls(false);
      }, 2000);
    }
  };

  const toggleMute = async () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    await videoRef.current.setIsMutedAsync(newMuted);
    setIsMuted(newMuted);
  };

  const handleSeek = async (value: number) => {
    if (!videoRef.current) return;
    const seekPosition = value * duration * 1000;
    await videoRef.current.setPositionAsync(seekPosition);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <View style={[styles.container, style]}>
      <Video
        ref={videoRef}
        source={{ uri }}
        posterSource={poster ? { uri: poster } : undefined}
        usePoster={!!poster}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        shouldPlay={autoPlay}
        isLooping={false}
        isMuted={isMuted}
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
        style={styles.touchArea}
        onPress={() => setShowControls(!showControls)}
        activeOpacity={1}
      >
        {showControls && (
          <View style={styles.controlsOverlay}>
            <TouchableOpacity
              style={[styles.playButton, { backgroundColor: colors.primary }]}
              onPress={togglePlayPause}
              activeOpacity={0.9}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={32}
                color="#fff"
              />
            </TouchableOpacity>

            <View style={styles.bottomControls}>
              <View style={styles.progressContainer}>
                <Text style={styles.timeText}>{formatTime(position)}</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={1}
                  value={duration > 0 ? position / duration : 0}
                  onSlidingComplete={handleSeek}
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor="rgba(255,255,255,0.3)"
                  thumbTintColor={colors.primary}
                />
                <Text style={styles.timeText}>{formatTime(duration)}</Text>
              </View>

              <TouchableOpacity
                style={styles.muteButton}
                onPress={toggleMute}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isMuted ? "volume-mute" : "volume-medium"}
                  size={24}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 400,
    backgroundColor: "#000",
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  touchArea: {
    ...StyleSheet.absoluteFillObject,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  bottomControls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  timeText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
    minWidth: 40,
    textAlign: "center",
  },
  slider: {
    flex: 1,
    marginHorizontal: 10,
    height: 40,
  },
  muteButton: {
    alignSelf: "flex-end",
    padding: 8,
  },
});
