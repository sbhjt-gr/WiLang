import AsyncStorage from '@react-native-async-storage/async-storage';

const SPEECH_ENGINE_KEY = '@whisperlang/speech_engine';

export type SpeechEngine = 'whisper' | 'native';

export type SpeechRecognitionSettings = {
  engine: SpeechEngine;
};

const DEFAULT_SETTINGS: SpeechRecognitionSettings = {
  engine: 'whisper',
};

let cachedSettings: SpeechRecognitionSettings = DEFAULT_SETTINGS;
const listeners: Set<(settings: SpeechRecognitionSettings) => void> = new Set();

const loadSettings = async (): Promise<SpeechRecognitionSettings> => {
  try {
    const stored = await AsyncStorage.getItem(SPEECH_ENGINE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      cachedSettings = { ...DEFAULT_SETTINGS, ...parsed };
      return cachedSettings;
    }
  } catch {}
  return DEFAULT_SETTINGS;
};

const saveSettings = async (settings: SpeechRecognitionSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(SPEECH_ENGINE_KEY, JSON.stringify(settings));
    cachedSettings = settings;
    listeners.forEach((listener) => listener(settings));
  } catch {}
};

export const setSpeechEngine = async (engine: SpeechEngine): Promise<void> => {
  const settings: SpeechRecognitionSettings = { engine };
  await saveSettings(settings);
};

export const getCachedSpeechSettings = (): SpeechRecognitionSettings => {
  return cachedSettings;
};

export const getSpeechSettings = async (): Promise<SpeechRecognitionSettings> => {
  return await loadSettings();
};

export const subscribeSpeechSettings = (
  callback: (settings: SpeechRecognitionSettings) => void,
): (() => void) => {
  listeners.add(callback);
  loadSettings().then(callback);
  return () => {
    listeners.delete(callback);
  };
};

loadSettings();
