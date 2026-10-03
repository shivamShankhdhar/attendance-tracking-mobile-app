import { useThemeStore } from '../stores/themeStore';
import { Colors } from '../constants/theme';

export function useTheme() {
  const { isDark, themeMode, setThemeMode, toggleTheme, palette } = useThemeStore();
  const themeColors = Colors[isDark ? 'dark' : 'light'];

  return {
    isDark,
    themeMode,
    setThemeMode,
    toggleTheme,
    palette,
    colors: palette,
    ...themeColors,
  };
}

