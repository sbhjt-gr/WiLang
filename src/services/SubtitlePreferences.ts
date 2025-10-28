import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WhisperLanguage } from './whisper/ModelPreferences';

export type ExpoSpeechMode = 'cloud' | 'device' | 'auto';

const MODE_KEY = '@wilang:subtitle_expo_mode';
const LANG_KEY = '@wilang:subtitle_expo_lang';

const DEFAULT_MODE: ExpoSpeechMode = 'cloud';
const DEFAULT_LANG: WhisperLanguage = 'auto';

const LANG_MAP: Record<WhisperLanguage, string> = {
  auto: 'en-US',
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  hi: 'hi-IN',
  de: 'de-DE',
  pt: 'pt-BR',
  bn: 'bn-BD',
  sv: 'sv-SE',
  ja: 'ja-JP',
  ko: 'ko-KR',
};

export const EXPO_ON_DEVICE_SERVICE = 'com.google.android.as';

export const SubtitlePreferences = {
  async getExpoMode(): Promise<ExpoSpeechMode> {
    try {
      const value = await AsyncStorage.getItem(MODE_KEY);
      if (value === 'cloud' || value === 'device' || value === 'auto') {
        return value;
      }
    } catch (error) {
    }
    return DEFAULT_MODE;
  },
  async setExpoMode(value: ExpoSpeechMode): Promise<void> {
    try {
      await AsyncStorage.setItem(MODE_KEY, value);
    } catch (error) {
    }
  },
  async getExpoLanguage(): Promise<WhisperLanguage> {
    try {
      const value = await AsyncStorage.getItem(LANG_KEY);
      if (value && value in LANG_MAP) {
        return value as WhisperLanguage;
      }
    } catch (error) {
    }
    return DEFAULT_LANG;
  },
  async setExpoLanguage(value: WhisperLanguage): Promise<void> {
    try {
      await AsyncStorage.setItem(LANG_KEY, value);
    } catch (error) {
    }
  },
  getLocale(code: WhisperLanguage): string {
    return LANG_MAP[code] || 'en-US';
  },
};
