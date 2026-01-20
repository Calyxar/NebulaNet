import { useColorScheme } from 'react-native'
import { darkColors, lightColors } from './colors'

export function useTheme() {
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'

  return {
    isDark,
    colors: isDark ? darkColors : lightColors,
  }
}
