import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useColorScheme, Appearance, Platform, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeColors, getColors } from './colors';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => Promise<void>;
  isDark: boolean;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const THEME_STORAGE_KEY = '@app_theme_preference';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  const getResolvedTheme = useCallback((themeMode: ThemeMode, systemScheme: ColorSchemeName): 'light' | 'dark' => {
    if (themeMode === 'system') {
      return systemScheme === 'dark' ? 'dark' : 'light';
    }
    return themeMode;
  }, []);

  const resolvedTheme = getResolvedTheme(theme, systemColorScheme);
  const isDark = resolvedTheme === 'dark';
  const colors = getColors(resolvedTheme);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
          setThemeState(savedTheme as ThemeMode);
          if (Platform.OS === 'android') {
            Appearance.setColorScheme(savedTheme === 'system' ? null : (savedTheme as 'light' | 'dark'));
          }
        }
      } catch (error) {
        console.log('theme_load_error');
      } finally {
        setIsLoaded(true);
      }
    };
    loadTheme();
  }, []);

  useEffect(() => {
    const listener = Appearance.addChangeListener(({ colorScheme }) => {
      if (theme === 'system') {
        setThemeState('system');
      }
    });
    return () => listener.remove();
  }, [theme]);

  const setTheme = useCallback(async (newTheme: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
      setThemeState(newTheme);
      if (Platform.OS === 'android') {
        Appearance.setColorScheme(newTheme === 'system' ? null : newTheme);
      }
    } catch (error) {
      console.log('theme_save_error');
    }
  }, []);

  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, isDark, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
