import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@whisperlang/model-settings/v1';

type Listener = (settings: ModelSettings) => void;

export type ModelSettings = {
  manualModelPath: string | null;
  manualModelName: string | null;
  manualVadPath: string | null;
  manualVadName: string | null;
};

const defaultSettings: ModelSettings = {
  manualModelPath: null,
  manualModelName: null,
  manualVadPath: null,
  manualVadName: null,
};

let cachedSettings: ModelSettings = defaultSettings;
const listeners = new Set<Listener>();
let isLoaded = false;

const persist = async (settings: ModelSettings) => {
  cachedSettings = settings;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  listeners.forEach((listener) => listener(cachedSettings));
};

const updateSettings = async (patch: Partial<ModelSettings>) => {
  await ensureLoaded();
  await persist({ ...cachedSettings, ...patch });
};

export const ensureLoaded = async (): Promise<ModelSettings> => {
  if (isLoaded) {
    return cachedSettings;
  }
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      cachedSettings = { ...defaultSettings, ...JSON.parse(raw) };
    }
  } catch {
    cachedSettings = defaultSettings;
  }
  isLoaded = true;
  return cachedSettings;
};

export const getModelSettings = async (): Promise<ModelSettings> => {
  await ensureLoaded();
  return cachedSettings;
};

export const subscribeModelSettings = (listener: Listener): (() => void) => {
  listeners.add(listener);
  if (isLoaded) {
    listener(cachedSettings);
  } else {
    ensureLoaded().then(() => {
      listener(cachedSettings);
    });
  }
  return () => {
    listeners.delete(listener);
  };
};

export const setManualModel = async (path: string, name: string): Promise<void> => {
  await updateSettings({ manualModelPath: path, manualModelName: name });
};

export const clearManualModel = async (): Promise<void> => {
  await updateSettings({ manualModelPath: null, manualModelName: null });
};

export const setManualVad = async (path: string, name: string): Promise<void> => {
  await updateSettings({ manualVadPath: path, manualVadName: name });
};

export const clearManualVad = async (): Promise<void> => {
  await updateSettings({ manualVadPath: null, manualVadName: null });
};

export const getCachedModelSettings = (): ModelSettings => cachedSettings;
