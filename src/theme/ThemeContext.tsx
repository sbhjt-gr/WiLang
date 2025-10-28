import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode, ThemePreference, ThemeColors, getColors } from './colors';

interface ThemeContextType {
  theme: ThemePreference;
  colors: ThemeColors;
  setTheme: (theme: ThemePreference) => Promise<void>;
  toggleTheme: () => Promise<void>;
  usePitchBlack?: boolean;
  setUsePitchBlack?: (value: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@whisperlang_theme';
const PITCH_BLACK_KEY = '@whisperlang_pitch_black';

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [usePitchBlack, setUsePitchBlackState] = useState<boolean>(false);
  const [colors, setColors] = useState<ThemeColors>(getColors('dark'));

  const getSystemTheme = (): ThemeMode => {
    const colorScheme = Appearance.getColorScheme();
    return colorScheme === 'dark' ? 'dark' : 'light';
  };

  const getActualTheme = (preference: ThemePreference, isPitchBlack: boolean): ThemeMode => {
    let baseTheme: ThemeMode;
    if (preference === 'system') {
      baseTheme = getSystemTheme();
    } else {
      baseTheme = preference;
    }

    // If dark mode and pitch black is enabled, use pitch black
    if (baseTheme === 'dark' && isPitchBlack) {
      return 'pitchBlack';
    }

    return baseTheme;
  };

  const updateColors = (preference: ThemePreference, isPitchBlack: boolean = usePitchBlack) => {
    const actualTheme = getActualTheme(preference, isPitchBlack);
    setColors(getColors(actualTheme));
  };

  useEffect(() => {
    loadTheme();
  }, []);

  useEffect(() => {
    if (themePreference === 'system') {
      const subscription = Appearance.addChangeListener(() => {
        updateColors('system', usePitchBlack);
      });
      return () => subscription.remove();
    }
  }, [themePreference, usePitchBlack]);

  useEffect(() => {
    // Update colors when pitch black preference changes
    updateColors(themePreference, usePitchBlack);
  }, [usePitchBlack]);

  const loadTheme = async () => {
    try {
      const [savedTheme, savedPitchBlack] = await Promise.all([
        AsyncStorage.getItem(THEME_STORAGE_KEY),
        AsyncStorage.getItem(PITCH_BLACK_KEY),
      ]);

      const isPitchBlack = savedPitchBlack === 'true';
      setUsePitchBlackState(isPitchBlack);

      if (savedTheme && (savedTheme === 'system' || savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'pitchBlack')) {
        const preference = savedTheme as ThemePreference;
        setThemePreferenceState(preference);
        updateColors(preference, isPitchBlack);
      } else {
        updateColors('system', isPitchBlack);
      }
    } catch (error) {
      console.error('theme_load_error', error);
      updateColors('system', false);
    }
  };

  const setTheme = async (newTheme: ThemePreference) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
      setThemePreferenceState(newTheme);
      updateColors(newTheme, usePitchBlack);
    } catch (error) {
      console.error('theme_save_error', error);
    }
  };

  const setUsePitchBlack = (value: boolean) => {
    setUsePitchBlackState(value);
  };

  const toggleTheme = async () => {
    const themeOrder: ThemePreference[] = ['system', 'light', 'dark'];
    const currentIndex = themeOrder.indexOf(themePreference);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    await setTheme(themeOrder[nextIndex]);
  };

  return (
    <ThemeContext.Provider value={{ theme: themePreference, colors, setTheme, toggleTheme, usePitchBlack, setUsePitchBlack }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
