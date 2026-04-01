// components/media/ZoomableImage.tsx
// Drop-in replacement for any <Image> that needs pinch-to-zoom
// Usage: <ZoomableImage uri="https://..." style={styles.postImage} />

import React, { useState } from "react";
import {
    Image,
    ImageStyle,
    StyleProp,
    TouchableOpacity,
    ViewStyle,
} from "react-native";
import ImageViewing from "react-native-image-viewing";

interface ZoomableImageProps {
  uri: string;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  resizeMode?: "cover" | "contain" | "stretch" | "center";
  // Pass siblings if this image is part of a gallery (for swipe support)
  gallery?: string[];
  galleryIndex?: number;
}

export default function ZoomableImage({
  uri,
  style,
  containerStyle,
  resizeMode = "cover",
  gallery,
  galleryIndex = 0,
}: ZoomableImageProps) {
  const [visible, setVisible] = useState(false);

  // Build images array — use gallery if provided, else single image
  const images = gallery ? gallery.map((u) => ({ uri: u })) : [{ uri }];

  const startIndex = gallery ? galleryIndex : 0;

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={() => setVisible(true)}
        style={containerStyle}
      >
        <Image source={{ uri }} style={style} resizeMode={resizeMode} />
      </TouchableOpacity>

      <ImageViewing
        images={images}
        imageIndex={startIndex}
        visible={visible}
        onRequestClose={() => setVisible(false)}
        swipeToCloseEnabled
        doubleTapToZoomEnabled
        presentationStyle="overFullScreen"
      />
    </>
  );
}
