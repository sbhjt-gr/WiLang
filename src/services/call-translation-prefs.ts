import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SourceLangCode, TargetLangCode } from './palabra/types';

const KEYS = {
  SOURCE: '@wilang:call_translation_source',
  TARGET: '@wilang:call_translation_target',
  ENABLED: '@wilang:call_translation_enabled',
  CLIENT_ID: '@wilang:palabra_client_id',
  CLIENT_SECRET: '@wilang:palabra_client_secret',
  GEMINI_KEY: '@wilang:gemini_api_key',
};

const DEFAULT_SOURCE: SourceLangCode = 'auto';
const DEFAULT_TARGET: TargetLangCode = 'en-us';

const VALID_SOURCE_LANGS: SourceLangCode[] = [
  'auto', 'ar', 'be', 'bg', 'bn', 'ca', 'cs', 'cy', 'da', 'de', 'el',
  'en', 'es', 'et', 'fi', 'fr', 'gl', 'he', 'hi', 'hr', 'hu',
  'id', 'it', 'ja', 'ko', 'lt', 'lv', 'ms', 'nl', 'no', 'pl',
  'pt', 'ro', 'ru', 'sk', 'sl', 'sv', 'sw', 'ta', 'th', 'tr',
  'uk', 'ur', 'vi', 'zh',
];

function normalizeSourceLang(val: string | null): SourceLangCode {
  if (!val) return DEFAULT_SOURCE;
  if (VALID_SOURCE_LANGS.includes(val as SourceLangCode)) return val as SourceLangCode;
  const base = val.split('-')[0].toLowerCase();
  if (VALID_SOURCE_LANGS.includes(base as SourceLangCode)) return base as SourceLangCode;
  return DEFAULT_SOURCE;
}

export const CallTranslationPrefs = {
  async getSource(): Promise<SourceLangCode> {
    try {
      const val = await AsyncStorage.getItem(KEYS.SOURCE);
      return normalizeSourceLang(val);
    } catch {
      return DEFAULT_SOURCE;
    }
  },

  async setSource(lang: SourceLangCode): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.SOURCE, lang);
    } catch {
      console.log('call_prefs_save_err');
    }
  },

  async getTarget(): Promise<TargetLangCode> {
    try {
      const val = await AsyncStorage.getItem(KEYS.TARGET);
      return (val as TargetLangCode) || DEFAULT_TARGET;
    } catch {
      return DEFAULT_TARGET;
    }
  },

  async setTarget(lang: TargetLangCode): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.TARGET, lang);
    } catch {
      console.log('call_prefs_save_err');
    }
  },

  async isEnabled(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(KEYS.ENABLED);
      return val === '1';
    } catch {
      return false;
    }
  },

  async setEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.ENABLED, enabled ? '1' : '0');
    } catch {
      console.log('call_prefs_save_err');
    }
  },

  async getClientId(): Promise<string> {
    try {
      const val = await AsyncStorage.getItem(KEYS.CLIENT_ID);
      return val || '';
    } catch {
      return '';
    }
  },

  async setClientId(id: string): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.CLIENT_ID, id);
    } catch {
      console.log('call_prefs_save_err');
    }
  },

  async getClientSecret(): Promise<string> {
    try {
      const val = await AsyncStorage.getItem(KEYS.CLIENT_SECRET);
      return val || '';
    } catch {
      return '';
    }
  },

  async setClientSecret(secret: string): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.CLIENT_SECRET, secret);
    } catch {
      console.log('call_prefs_save_err');
    }
  },

  async getGeminiKey(): Promise<string> {
    try {
      const val = await AsyncStorage.getItem(KEYS.GEMINI_KEY);
      return val || '';
    } catch {
      return '';
    }
  },

  async setGeminiKey(key: string): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.GEMINI_KEY, key);
    } catch {
      console.log('call_prefs_save_err');
    }
  },

  async getAll(): Promise<{
    source: SourceLangCode;
    target: TargetLangCode;
    enabled: boolean;
    clientId: string;
    clientSecret: string;
    geminiKey: string;
  }> {
    const [source, target, enabled, clientId, clientSecret, geminiKey] = await Promise.all([
      this.getSource(),
      this.getTarget(),
      this.isEnabled(),
      this.getClientId(),
      this.getClientSecret(),
      this.getGeminiKey(),
    ]);
    return { source, target, enabled, clientId, clientSecret, geminiKey };
  },
};

export default CallTranslationPrefs;
