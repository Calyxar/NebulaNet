import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Audio, AVPlaybackStatus, ResizeMode, Video } from 'expo-av';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

type MediaType = 'image' | 'video' | 'audio' | 'document';

interface MediaPlayerProps {
  uri: string;
  type: MediaType;
  poster?: string;
  title?: string;
  autoPlay?: boolean;
  showControls?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnd?: () => void;
  onError?: (error: any) => void;
}

export default function MediaPlayer({
  uri,
  type,
  poster,
  title,
  autoPlay = false,
  showControls = true,
  onPlay,
  onPause,
  onEnd,
  onError,
}: MediaPlayerProps) {
  const videoRef = useRef<Video>(null);
  const audioRef = useRef<Audio.Sound>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isLoading, setIsLoading] = useState(true);
  const [showFullControls, setShowFullControls] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  const onPlaybackStatusUpdate = useCallback((playbackStatus: AVPlaybackStatus) => {
    if (!playbackStatus.isLoaded) return;
    
    if (playbackStatus.durationMillis) {
      setDuration(playbackStatus.durationMillis / 1000);
    }
    
    if (playbackStatus.positionMillis) {
      setPosition(playbackStatus.positionMillis / 1000);
    }

    setIsPlaying(playbackStatus.isPlaying);

    if (playbackStatus.didJustFinish && !playbackStatus.isLooping) {
      onEnd?.();
    }
  }, [onEnd]);

  const loadAudio = useCallback(async () => {
    try {
      setIsLoading(true);
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: autoPlay },
        onPlaybackStatusUpdate
      );
      audioRef.current = sound;
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading audio:', error);
      onError?.(error);
      setIsLoading(false);
    }
  }, [uri, autoPlay, onPlaybackStatusUpdate, onError]);

  useEffect(() => {
    if (type === 'audio') {
      loadAudio();
    }
    return () => {
      if (type === 'audio' && audioRef.current) {
        audioRef.current.unloadAsync();
      }
    };
  }, [type, loadAudio]);

  const handlePlayPause = async () => {
    try {
      if (type === 'video' && videoRef.current) {
        if (isPlaying) {
          await videoRef.current.pauseAsync();
          onPause?.();
        } else {
          await videoRef.current.playAsync();
          onPlay?.();
        }
      } else if (type === 'audio' && audioRef.current) {
        if (isPlaying) {
          await audioRef.current.pauseAsync();
          onPause?.();
        } else {
          await audioRef.current.playAsync();
          onPlay?.();
        }
      }
    } catch (error) {
      console.error('Error playing/pausing:', error);
    }
  };

  const handleSeek = async (value: number) => {
    try {
      const seekPosition = value * duration;
      if (type === 'video' && videoRef.current) {
        await videoRef.current.setPositionAsync(seekPosition * 1000);
      } else if (type === 'audio' && audioRef.current) {
        await audioRef.current.setPositionAsync(seekPosition * 1000);
      }
      setPosition(seekPosition);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  const handleVolumeChange = async (value: number) => {
    try {
      setVolume(value);
      if (type === 'video' && videoRef.current) {
        await videoRef.current.setVolumeAsync(value);
      } else if (type === 'audio' && audioRef.current) {
        await audioRef.current.setVolumeAsync(value);
      }
      setIsMuted(value === 0);
    } catch (error) {
      console.error('Error changing volume:', error);
    }
  };

  const handleMuteToggle = async () => {
    try {
      const newMutedState = !isMuted;
      const newVolume = newMutedState ? 0 : 1;
      
      setIsMuted(newMutedState);
      setVolume(newVolume);
      
      if (type === 'video' && videoRef.current) {
        await videoRef.current.setVolumeAsync(newVolume);
      } else if (type === 'audio' && audioRef.current) {
        await audioRef.current.setVolumeAsync(newVolume);
      }
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  };

  const handlePlaybackRateChange = async (rate: number) => {
    try {
      setPlaybackRate(rate);
      if (type === 'video' && videoRef.current) {
        await videoRef.current.setRateAsync(rate, true);
      } else if (type === 'audio' && audioRef.current) {
        await audioRef.current.setRateAsync(rate, true);
      }
    } catch (error) {
      console.error('Error changing playback rate:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderVideoPlayer = () => (
    <View style={styles.videoContainer}>
      <Video
        ref={videoRef}
        source={{ uri }}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        useNativeControls={false}
        isLooping={false}
        onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        onLoadStart={() => setIsLoading(true)}
        onLoad={() => setIsLoading(false)}
        onError={onError}
      />
      
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}

      {showControls && (
        <TouchableOpacity
          style={styles.controlsOverlay}
          onPress={() => setShowFullControls(!showFullControls)}
          activeOpacity={1}
        >
          {showFullControls && (
            <View style={styles.fullControls}>
              {/* Title */}
              {title && (
                <Text style={styles.mediaTitle} numberOfLines={1}>
                  {title}
                </Text>
              )}

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <Text style={styles.timeText}>{formatTime(position)}</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={1}
                  value={duration > 0 ? position / duration : 0}
                  onSlidingComplete={handleSeek}
                  minimumTrackTintColor="#007AFF"
                  maximumTrackTintColor="rgba(255,255,255,0.3)"
                  thumbTintColor="#007AFF"
                />
                <Text style={styles.timeText}>{formatTime(duration)}</Text>
              </View>

              {/* Control Buttons */}
              <View style={styles.controlButtons}>
                <TouchableOpacity onPress={handleMuteToggle}>
                  <Ionicons
                    name={isMuted ? "volume-mute" : "volume-medium"}
                    size={24}
                    color="#fff"
                  />
                </TouchableOpacity>

                <TouchableOpacity onPress={handlePlayPause}>
                  <Ionicons
                    name={isPlaying ? "pause-circle" : "play-circle"}
                    size={48}
                    color="#fff"
                  />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => handlePlaybackRateChange(
                  playbackRate === 2 ? 1 : playbackRate === 1.5 ? 2 : 1.5
                )}>
                  <Text style={styles.playbackRateText}>{playbackRate}x</Text>
                </TouchableOpacity>
              </View>

              {/* Volume Control */}
              <View style={styles.volumeContainer}>
                <Ionicons name="volume-low" size={20} color="#fff" />
                <Slider
                  style={styles.volumeSlider}
                  minimumValue={0}
                  maximumValue={1}
                  value={volume}
                  onSlidingComplete={handleVolumeChange}
                  minimumTrackTintColor="#007AFF"
                  maximumTrackTintColor="rgba(255,255,255,0.3)"
                  thumbTintColor="#007AFF"
                />
                <Ionicons name="volume-high" size={20} color="#fff" />
              </View>
            </View>
          )}

          {/* Minimal Controls */}
          {!showFullControls && (
            <TouchableOpacity
              style={styles.playButton}
              onPress={handlePlayPause}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={36}
                color="#fff"
              />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  const renderAudioPlayer = () => (
    <View style={styles.audioContainer}>
      <View style={styles.audioVisualizer}>
        <Ionicons name="musical-notes" size={60} color="#007AFF" />
      </View>

      <View style={styles.audioControls}>
        {title && (
          <Text style={styles.audioTitle} numberOfLines={1}>
            {title}
          </Text>
        )}

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            value={duration > 0 ? position / duration : 0}
            onSlidingComplete={handleSeek}
            minimumTrackTintColor="#007AFF"
            maximumTrackTintColor="#e1e1e1"
            thumbTintColor="#007AFF"
          />
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>

        {/* Control Buttons */}
        <View style={styles.audioControlButtons}>
          <TouchableOpacity onPress={handleMuteToggle}>
            <Ionicons
              name={isMuted ? "volume-mute" : "volume-medium"}
              size={24}
              color="#666"
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handlePlaybackRateChange(
            playbackRate === 2 ? 1 : playbackRate === 1.5 ? 2 : 1.5
          )}>
            <Text style={styles.audioPlaybackRate}>{playbackRate}x</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handlePlayPause}>
            <Ionicons
              name={isPlaying ? "pause-circle" : "play-circle"}
              size={48}
              color="#007AFF"
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => {
            // Skip forward 15 seconds
            handleSeek(Math.min(1, (position + 15) / duration));
          }}>
            <Ionicons name="play-forward" size={24} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => {
            // Skip backward 15 seconds
            handleSeek(Math.max(0, (position - 15) / duration));
          }}>
            <Ionicons name="play-back" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Volume Control */}
        <View style={styles.audioVolumeContainer}>
          <Slider
            style={styles.audioVolumeSlider}
            minimumValue={0}
            maximumValue={1}
            value={volume}
            onSlidingComplete={handleVolumeChange}
            minimumTrackTintColor="#007AFF"
            maximumTrackTintColor="#e1e1e1"
            thumbTintColor="#007AFF"
          />
        </View>
      </View>
    </View>
  );

  const renderDocumentViewer = () => (
    <View style={styles.documentContainer}>
      <Ionicons name="document-text" size={80} color="#007AFF" />
      <Text style={styles.documentTitle} numberOfLines={1}>
        {title || 'Document'}
      </Text>
      <Text style={styles.documentSubtitle}>Tap to open</Text>
      <TouchableOpacity style={styles.openButton}>
        <Text style={styles.openButtonText}>Open Document</Text>
      </TouchableOpacity>
    </View>
  );

  if (type === 'video') {
    return renderVideoPlayer();
  }

  if (type === 'audio') {
    return renderAudioPlayer();
  }

  if (type === 'document') {
    return renderDocumentViewer();
  }

  return null;
}

const styles = StyleSheet.create({
  videoContainer: {
    width: '100%',
    height: 250,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullControls: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 20,
    justifyContent: 'space-between',
  },
  mediaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  timeText: {
    fontSize: 12,
    color: '#fff',
    minWidth: 40,
    textAlign: 'center',
  },
  slider: {
    flex: 1,
    marginHorizontal: 10,
  },
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginVertical: 20,
  },
  playbackRateText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  volumeSlider: {
    flex: 1,
    marginHorizontal: 10,
  },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  audioVisualizer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  audioControls: {
    flex: 1,
  },
  audioTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  audioControlButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginVertical: 15,
  },
  audioPlaybackRate: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    padding: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
  },
  audioVolumeContainer: {
    marginTop: 10,
  },
  audioVolumeSlider: {
    width: '100%',
  },
  documentContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 4,
  },
  documentSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  openButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  openButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});