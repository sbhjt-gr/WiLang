import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFERRED_MODEL_KEY = '@wilang:preferred_whisper_model';
const PREFERRED_LANGUAGE_KEY = '@wilang:preferred_whisper_language';
const PREFERRED_ENGINE_KEY = '@wilang:preferred_stt_engine';

export type WhisperModelVariant = 'tiny' | 'base' | 'small' | 'medium' | 'large-v3';

export type WhisperLanguage = 'auto' | 'en' | 'es' | 'fr' | 'hi' | 'de' | 'pt' | 'bn' | 'sv' | 'ja' | 'ko';

export type SttEngine = 'whisper' | 'speech-recognition';

export const SUPPORTED_LANGUAGES: { code: WhisperLanguage; name: string }[] = [
  { code: 'auto', name: 'Auto Detect' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'hi', name: 'Hindi' },
  { code: 'de', name: 'German' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'bn', name: 'Bengali' },
  { code: 'sv', name: 'Swedish' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
];

export const SUPPORTED_ENGINES: { key: SttEngine; title: string; description: string }[] = [
  {
    key: 'whisper',
    title: 'On-Device Whisper',
    description: 'Download models for offline transcription',
  },
  {
    key: 'speech-recognition',
    title: 'System Speech Recognition',
    description: 'Use platform speech APIs with data usage',
  },
];

export const ModelPreferences = {
  async getPreferredModel(): Promise<WhisperModelVariant> {
    try {
      const stored = await AsyncStorage.getItem(PREFERRED_MODEL_KEY);
      if (stored && ['tiny', 'base', 'small', 'medium', 'large-v3'].includes(stored)) {
        return stored as WhisperModelVariant;
      }
    } catch (error) {
    }
    return 'small';
  },

  async setPreferredModel(model: WhisperModelVariant): Promise<void> {
    try {
      await AsyncStorage.setItem(PREFERRED_MODEL_KEY, model);
    } catch (error) {
    }
  },

  async getPreferredLanguage(): Promise<WhisperLanguage> {
    try {
      const stored = await AsyncStorage.getItem(PREFERRED_LANGUAGE_KEY);
      if (stored && SUPPORTED_LANGUAGES.some(lang => lang.code === stored)) {
        return stored as WhisperLanguage;
      }
    } catch (error) {
    }
    return 'auto';
  },

  async setPreferredLanguage(language: WhisperLanguage): Promise<void> {
    try {
      await AsyncStorage.setItem(PREFERRED_LANGUAGE_KEY, language);
    } catch (error) {
    }
  },

  async getPreferredEngine(): Promise<SttEngine> {
    try {
      const stored = await AsyncStorage.getItem(PREFERRED_ENGINE_KEY);
      if (stored && (stored === 'whisper' || stored === 'speech-recognition')) {
        return stored as SttEngine;
      }
    } catch (error) {
    }
    return 'whisper';
  },

  async setPreferredEngine(engine: SttEngine): Promise<void> {
    try {
      await AsyncStorage.setItem(PREFERRED_ENGINE_KEY, engine);
    } catch (error) {
    }
  },
};
