import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Animated,
    Easing,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type ReactionType = 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry';

interface Reaction {
  type: ReactionType;
  emoji: string;
  label: string;
  color: string;
}

interface ReactionButtonsProps {
  onReactionSelect?: (reaction: ReactionType | null) => void;
  initialReaction?: ReactionType | null;
  showCount?: boolean;
  reactionCount?: number;
}

export default function ReactionButtons({
  onReactionSelect,
  initialReaction = null,
  showCount = true,
  reactionCount = 0,
}: ReactionButtonsProps) {
  const [selectedReaction, setSelectedReaction] = useState<ReactionType | null>(initialReaction);
  const [showPicker, setShowPicker] = useState(false);
  const scaleAnim = useState(new Animated.Value(1))[0];

  const reactions: Reaction[] = [
    { type: 'like', emoji: '👍', label: 'Like', color: '#007AFF' },
    { type: 'love', emoji: '❤️', label: 'Love', color: '#ff375f' },
    { type: 'laugh', emoji: '😂', label: 'Laugh', color: '#FF9500' },
    { type: 'wow', emoji: '😮', label: 'Wow', color: '#FFCC00' },
    { type: 'sad', emoji: '😢', label: 'Sad', color: '#5AC8FA' },
    { type: 'angry', emoji: '😠', label: 'Angry', color: '#FF3B30' },
  ];

  const selectedReactionData = reactions.find(r => r.type === selectedReaction);

  const animateButton = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 100,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleReactionSelect = (reaction: ReactionType | null) => {
    const newReaction = selectedReaction === reaction ? null : reaction;
    setSelectedReaction(newReaction);
    setShowPicker(false);
    animateButton();
    onReactionSelect?.(newReaction);
  };

  const handleLongPress = () => {
    setShowPicker(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.mainButtonContainer}>
        <TouchableOpacity
          onPress={() => {
            if (selectedReaction) {
              handleReactionSelect(selectedReaction);
            } else {
              handleReactionSelect('like');
            }
          }}
          onLongPress={handleLongPress}
          activeOpacity={0.7}
          style={styles.mainButton}
        >
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            {selectedReaction ? (
              <View style={styles.selectedReaction}>
                <Text style={styles.selectedEmoji}>
                  {selectedReactionData?.emoji}
                </Text>
                {showCount && reactionCount > 0 && (
                  <Text style={[
                    styles.countText,
                    { color: selectedReactionData?.color }
                  ]}>
                    {reactionCount}
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.defaultReaction}>
                <Ionicons name="heart-outline" size={24} color="#666" />
                {showCount && reactionCount > 0 && (
                  <Text style={styles.countText}>
                    {reactionCount}
                  </Text>
                )}
              </View>
            )}
          </Animated.View>
        </TouchableOpacity>

        {showPicker && (
          <View style={styles.reactionPicker}>
            <View style={styles.pickerBackground} />
            {reactions.map((reaction) => (
              <TouchableOpacity
                key={reaction.type}
                style={[
                  styles.reactionButton,
                  selectedReaction === reaction.type && styles.selectedButton,
                ]}
                onPress={() => handleReactionSelect(reaction.type)}
                activeOpacity={0.7}
              >
                <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                {selectedReaction === reaction.type && (
                  <View style={[
                    styles.selectedIndicator,
                    { backgroundColor: reaction.color }
                  ]} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {showPicker && (
        <TouchableOpacity
          style={styles.overlay}
          onPress={() => setShowPicker(false)}
          activeOpacity={1}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  mainButtonContainer: {
    position: 'relative',
    zIndex: 10,
  },
  mainButton: {
    padding: 8,
  },
  selectedReaction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedEmoji: {
    fontSize: 24,
  },
  defaultReaction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  reactionPicker: {
    position: 'absolute',
    bottom: 45,
    left: -60,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 20,
  },
  pickerBackground: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -6,
    width: 12,
    height: 12,
    backgroundColor: '#fff',
    transform: [{ rotate: '45deg' }],
  },
  reactionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: 'relative',
  },
  reactionEmoji: {
    fontSize: 24,
  },
  selectedButton: {
    marginHorizontal: 2,
  },
  selectedIndicator: {
    position: 'absolute',
    bottom: -2,
    left: '50%',
    marginLeft: -3,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },
});