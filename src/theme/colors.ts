export type ThemeMode = 'light' | 'dark' | 'pitchBlack';

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;

  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;

  surface: string;
  surfaceSecondary: string;
  surfaceTertiary: string;

  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  border: string;
  borderLight: string;
  borderFocus: string;

  error: string;
  errorLight: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  info: string;
  infoLight: string;

  overlay: string;
  overlayLight: string;

  gradient1: string[];
  gradient2: string[];
  gradient3: string[];
  gradient4: string[];
  gradient5: string[];
  gradient6: string[];

  statusBar: 'light-content' | 'dark-content';
}

const lightColors: ThemeColors = {
  primary: '#667eea',
  primaryLight: 'rgba(102, 126, 234, 0.1)',
  primaryDark: '#5568d3',
  secondary: '#764ba2',
  secondaryLight: 'rgba(118, 75, 162, 0.1)',
  secondaryDark: '#653e8c',

  background: '#f8fafc',
  backgroundSecondary: '#ffffff',
  backgroundTertiary: '#f1f5f9',

  surface: '#ffffff',
  surfaceSecondary: 'rgba(255,255,255,0.95)',
  surfaceTertiary: 'rgba(255,255,255,0.8)',

  text: '#1f2937',
  textSecondary: '#6b7280',
  textTertiary: '#9ca3af',
  textInverse: '#ffffff',

  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  borderFocus: '#667eea',

  error: '#ef4444',
  errorLight: '#fee2e2',
  success: '#10b981',
  successLight: '#d1fae5',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  info: '#3b82f6',
  infoLight: '#dbeafe',

  overlay: 'rgba(0,0,0,0.6)',
  overlayLight: 'rgba(0,0,0,0.3)',

  gradient1: ['#667eea', '#764ba2'],
  gradient2: ['#ff9a9e', '#fecfef'],
  gradient3: ['#a8edea', '#fed6e3'],
  gradient4: ['#22d3ee', '#3b82f6'],
  gradient5: ['#ff6b6b', '#ee5a52'],
  gradient6: ['#10b981', '#059669'],

  statusBar: 'light-content',
};

const darkColors: ThemeColors = {
  primary: '#7590ff',
  primaryLight: 'rgba(117, 144, 255, 0.12)',
  primaryDark: '#5f7eeb',
  secondary: '#8c5fb5',
  secondaryLight: 'rgba(140, 95, 181, 0.12)',
  secondaryDark: '#7a4f9f',

  background: '#0a0d14',
  backgroundSecondary: '#0f1419',
  backgroundTertiary: '#151a21',

  surface: '#141922',
  surfaceSecondary: 'rgba(20,25,34,0.95)',
  surfaceTertiary: 'rgba(20,25,34,0.8)',

  text: '#d4dae5',
  textSecondary: '#7a828e',
  textTertiary: '#5c6370',
  textInverse: '#ffffff',

  border: '#252a33',
  borderLight: '#1a1e26',
  borderFocus: '#7590ff',

  error: '#e8413f',
  errorLight: '#241313',
  success: '#3aa846',
  successLight: '#152419',
  warning: '#c28916',
  warningLight: '#241f10',
  info: '#4a94eb',
  infoLight: '#141f2e',

  overlay: 'rgba(0,0,0,0.8)',
  overlayLight: 'rgba(0,0,0,0.6)',

  gradient1: ['#5f7eeb', '#7a4f9f'],
  gradient2: ['#e85a89', '#d89cc5'],
  gradient3: ['#3db6ae', '#e85a89'],
  gradient4: ['#1fb8d4', '#4a94eb'],
  gradient5: ['#e8413f', '#c73838'],
  gradient6: ['#3aa846', '#2d8838'],

  statusBar: 'light-content',
};

const pitchBlackColors: ThemeColors = {
  primary: '#7590ff',
  primaryLight: 'rgba(117, 144, 255, 0.1)',
  primaryDark: '#5f7eeb',
  secondary: '#8c5fb5',
  secondaryLight: 'rgba(140, 95, 181, 0.1)',
  secondaryDark: '#7a4f9f',

  background: '#000000',
  backgroundSecondary: '#050505',
  backgroundTertiary: '#0d0d0d',

  surface: '#0d0d0d',
  surfaceSecondary: 'rgba(13,13,13,0.95)',
  surfaceTertiary: 'rgba(13,13,13,0.8)',

  text: '#d4dae5',
  textSecondary: '#7a828e',
  textTertiary: '#5c6370',
  textInverse: '#ffffff',

  border: '#1a1a1a',
  borderLight: '#0d0d0d',
  borderFocus: '#7590ff',

  error: '#e8413f',
  errorLight: '#150808',
  success: '#3aa846',
  successLight: '#081308',
  warning: '#c28916',
  warningLight: '#150f05',
  info: '#4a94eb',
  infoLight: '#08111a',

  overlay: 'rgba(0,0,0,0.9)',
  overlayLight: 'rgba(0,0,0,0.7)',

  gradient1: ['#5f7eeb', '#7a4f9f'],
  gradient2: ['#e85a89', '#d89cc5'],
  gradient3: ['#3db6ae', '#e85a89'],
  gradient4: ['#1fb8d4', '#4a94eb'],
  gradient5: ['#e8413f', '#c73838'],
  gradient6: ['#3aa846', '#2d8838'],

  statusBar: 'light-content',
};

export const themeColors: Record<ThemeMode, ThemeColors> = {
  light: lightColors,
  dark: darkColors,
  pitchBlack: pitchBlackColors,
};

export const getColors = (mode: ThemeMode): ThemeColors => {
  return themeColors[mode];
};
