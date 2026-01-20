import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

interface TypingIndicatorProps {
  visible: boolean;
  color?: string;
  size?: number;
  speed?: number;
}

export default function TypingIndicator({
  visible,
  color = '#666',
  size = 4,
  speed = 300,
}: TypingIndicatorProps) {
  const [activeDot, setActiveDot] = useState(0);

  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      setActiveDot((prev) => (prev + 1) % 3);
    }, speed);

    return () => clearInterval(interval);
  }, [visible, speed]);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {[0, 1, 2].map((index) => (
        <View
          key={index}
          style={[
            styles.dot,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
              opacity: index === activeDot ? 1 : 0.4,
              transform: [
                { scale: index === activeDot ? 1.2 : 1 },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  dot: {
    marginHorizontal: 2,
  },
});