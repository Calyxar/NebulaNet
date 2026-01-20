// components/ui/Modal.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { ReactNode } from 'react';
import {
    Dimensions,
    Platform,
    Pressable,
    Modal as RNModal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { height: screenHeight } = Dimensions.get('window');

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  showCloseButton?: boolean;
  showHeader?: boolean;
  animationType?: 'slide' | 'fade' | 'none';
  presentationStyle?: 'fullScreen' | 'pageSheet' | 'formSheet' | 'overFullScreen';
  transparent?: boolean;
  backgroundColor?: string;
  maxHeight?: number;
  showBackdrop?: boolean;
  backdropOpacity?: number;
}

export default function Modal({
  visible,
  onClose,
  title,
  children,
  showCloseButton = true,
  showHeader = true,
  animationType = 'slide',
  presentationStyle = 'fullScreen',
  transparent = false,
  backgroundColor = '#fff',
  maxHeight = screenHeight * 0.9,
  showBackdrop = true,
  backdropOpacity = 0.5,
}: ModalProps) {
  const getModalStyle = () => {
    switch (presentationStyle) {
      case 'pageSheet':
        return styles.pageSheet;
      case 'formSheet':
        return styles.formSheet;
      case 'overFullScreen':
        return styles.overFullScreen;
      case 'fullScreen':
      default:
        return styles.fullScreen;
    }
  };

  return (
    <RNModal
      visible={visible}
      transparent={presentationStyle === 'overFullScreen' || transparent}
      animationType={animationType}
      onRequestClose={onClose}
      statusBarTranslucent={presentationStyle === 'fullScreen'}
    >
      {showBackdrop && presentationStyle !== 'fullScreen' && (
        <Pressable 
          style={[
            styles.backdrop,
            { backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})` }
          ]}
          onPress={onClose}
        />
      )}
      
      <View style={styles.outerContainer}>
        <View 
          style={[
            styles.modalContainer,
            getModalStyle(),
            { backgroundColor, maxHeight }
          ]}
        >
          {showHeader && (title || showCloseButton) && (
            <View style={styles.header}>
              {title && (
                <Text style={styles.title} numberOfLines={1}>
                  {title}
                </Text>
              )}
              
              {showCloseButton && (
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              )}
            </View>
          )}
          
          <View style={styles.content}>
            {children}
          </View>
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  fullScreen: {
    flex: 1,
    borderRadius: 0,
    marginTop: Platform.OS === 'android' ? 24 : 0,
  },
  pageSheet: {
    width: '100%',
    maxHeight: screenHeight * 0.75,
    marginTop: 'auto',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  formSheet: {
    width: Platform.OS === 'ios' ? 540 : '90%',
    maxWidth: 500,
    borderRadius: 12,
  },
  overFullScreen: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    backgroundColor: '#fafafa',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 16,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
});