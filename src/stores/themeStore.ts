import { create } from 'zustand';
import { LightPalette, PaletteType, setPaletteTheme } from '../constants/colors';

export type ThemeMode = 'light';

interface ThemeState {
  themeMode: ThemeMode;
  isDark: boolean;
  palette: PaletteType;
  themeVersion: number;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
  initTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeMode: 'light',
  isDark: false,
  palette: LightPalette,
  themeVersion: 1,

  setThemeMode: async (_mode: ThemeMode) => {
    setPaletteTheme(false);
    set({
      themeMode: 'light',
      isDark: false,
      palette: LightPalette,
      themeVersion: get().themeVersion + 1,
    });
  },

  toggleTheme: async () => {
    // Dark theme removed completely; maintain light theme
    setPaletteTheme(false);
    set({
      themeMode: 'light',
      isDark: false,
      palette: LightPalette,
      themeVersion: get().themeVersion + 1,
    });
  },

  initTheme: async () => {
    setPaletteTheme(false);
    set({
      themeMode: 'light',
      isDark: false,
      palette: LightPalette,
      themeVersion: get().themeVersion + 1,
    });
  },
}));
