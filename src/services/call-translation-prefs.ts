import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SourceLangCode, TargetLangCode } from './palabra/types';

const KEYS = {
  SOURCE: '@wilang:call_translation_source',
  TARGET: '@wilang:call_translation_target',
  ENABLED: '@wilang:call_translation_enabled',
};

const DEFAULT_SOURCE: SourceLangCode = 'auto';
const DEFAULT_TARGET: TargetLangCode = 'en-us';

export const CallTranslationPrefs = {
  async getSource(): Promise<SourceLangCode> {
    try {
      const val = await AsyncStorage.getItem(KEYS.SOURCE);
      return (val as SourceLangCode) || DEFAULT_SOURCE;
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

  async getAll(): Promise<{
    source: SourceLangCode;
    target: TargetLangCode;
    enabled: boolean;
  }> {
    const [source, target, enabled] = await Promise.all([
      this.getSource(),
      this.getTarget(),
      this.isEnabled(),
    ]);
    return { source, target, enabled };
  },
};

export default CallTranslationPrefs;
