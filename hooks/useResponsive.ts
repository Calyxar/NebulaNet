import { useEffect, useState } from "react";
import { Dimensions } from "react-native";

export const useResponsive = () => {
  const [dimensions, setDimensions] = useState(Dimensions.get("window"));

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  return {
    width: dimensions.width,
    height: dimensions.height,
    isSmallPhone: dimensions.width < 375,
    isTablet: dimensions.width >= 768,
    isLandscape: dimensions.width > dimensions.height,
  };
};
