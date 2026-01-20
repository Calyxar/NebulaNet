import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

interface MediaGalleryProps {
  media: string[];
  maxVisible?: number;
  onMediaPress?: (index: number) => void;
}

export default function MediaGallery({
  media,
  maxVisible = 4,
  onMediaPress,
}: MediaGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const visibleMedia = media.slice(0, maxVisible);
  const remainingCount = media.length - maxVisible;

  const handleMediaPress = (index: number) => {
    setSelectedIndex(index);
    setModalVisible(true);
    onMediaPress?.(index);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedIndex(null);
  };

  const goToPrevious = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const goToNext = () => {
    if (selectedIndex !== null && selectedIndex < media.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  if (media.length === 0) return null;

  const getGridStyle = () => {
    switch (visibleMedia.length) {
      case 1:
        return styles.singleGrid;
      case 2:
        return styles.doubleGrid;
      case 3:
        return styles.tripleGrid;
      default:
        return styles.quadGrid;
    }
  };

  return (
    <>
      <View style={[styles.container, getGridStyle()]}>
        {visibleMedia.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.mediaItem,
              index === 3 && remainingCount > 0 && styles.lastItem,
            ]}
            onPress={() => handleMediaPress(index)}
            activeOpacity={0.7}
          >
            <View style={styles.mediaContainer}>
              {/* Placeholder for image */}
              <View style={styles.mediaPlaceholder}>
                <Ionicons name="image-outline" size={32} color="#999" />
              </View>
              
              {/* Overlay for last item with count */}
              {index === 3 && remainingCount > 0 && (
                <View style={styles.overlay}>
                  <Text style={styles.overlayText}>+{remainingCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Full Screen Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.modalCloseButton}
            onPress={closeModal}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          {selectedIndex !== null && (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentOffset={{ x: selectedIndex * screenWidth, y: 0 }}
            >
              {media.map((item, index) => (
                <View key={index} style={styles.fullScreenMedia}>
                  <View style={styles.fullScreenPlaceholder}>
                    <Ionicons name="image-outline" size={60} color="#fff" />
                    <Text style={styles.fullScreenText}>
                      Image {index + 1} of {media.length}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Navigation Arrows */}
          {selectedIndex !== null && selectedIndex > 0 && (
            <TouchableOpacity
              style={[styles.navButton, styles.prevButton]}
              onPress={goToPrevious}
            >
              <Ionicons name="chevron-back" size={28} color="#fff" />
            </TouchableOpacity>
          )}

          {selectedIndex !== null && selectedIndex < media.length - 1 && (
            <TouchableOpacity
              style={[styles.navButton, styles.nextButton]}
              onPress={goToNext}
            >
              <Ionicons name="chevron-forward" size={28} color="#fff" />
            </TouchableOpacity>
          )}

          {/* Media Counter */}
          {selectedIndex !== null && (
            <View style={styles.counterContainer}>
              <Text style={styles.counterText}>
                {selectedIndex + 1} / {media.length}
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  singleGrid: {
    height: 300,
  },
  doubleGrid: {
    height: 200,
    flexDirection: 'row',
  },
  tripleGrid: {
    height: 200,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  quadGrid: {
    height: 200,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  mediaItem: {
    flex: 1,
    margin: 1,
  },
  mediaContainer: {
    flex: 1,
    position: 'relative',
  },
  mediaPlaceholder: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lastItem: {
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  fullScreenMedia: {
    width: screenWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenPlaceholder: {
    width: screenWidth * 0.9,
    height: screenWidth * 0.9,
    backgroundColor: '#333',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenText: {
    fontSize: 14,
    color: '#fff',
    marginTop: 12,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    padding: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
  },
  prevButton: {
    left: 20,
  },
  nextButton: {
    right: 20,
  },
  counterContainer: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  counterText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
});