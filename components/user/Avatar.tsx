import React from 'react';
import {
    Image,
    StyleSheet,
    Text,
    View,
} from 'react-native';

interface AvatarProps {
  size: number;
  name: string;
  image?: string;
  online?: boolean;
}

export default function Avatar({
  size,
  name,
  image,
  online = false,
}: AvatarProps) {
  const getInitials = () => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getColor = () => {
    const colors = [
      '#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE',
      '#FF2D55', '#5856D6', '#FFCC00', '#5AC8FA', '#FF9500',
    ];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <View style={styles.container}>
      {image ? (
        <Image
          source={{ uri: image }}
          style={[
            styles.avatar,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        />
      ) : (
        <View
          style={[
            styles.avatar,
            styles.initialsAvatar,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: getColor(),
            },
          ]}
        >
          <Text
            style={[
              styles.initials,
              { fontSize: size * 0.35 },
            ]}
          >
            {getInitials()}
          </Text>
        </View>
      )}
      
      {online && (
        <View style={[
          styles.onlineIndicator,
          {
            width: size * 0.3,
            height: size * 0.3,
            borderRadius: (size * 0.3) / 2,
            borderWidth: size * 0.05,
          },
        ]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  avatar: {
    overflow: 'hidden',
  },
  initialsAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#fff',
    fontWeight: 'bold',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#34C759',
    borderColor: '#fff',
  },
});