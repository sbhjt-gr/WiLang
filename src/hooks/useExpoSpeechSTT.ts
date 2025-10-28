import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  type ExpoSpeechRecognitionErrorEvent,
  type ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition';
import { EXPO_ON_DEVICE_SERVICE } from '../services/SubtitlePreferences';

type SubtitleState = {
  text: string;
  timestamp: number;
  isFinal: boolean;
  language: string | null;
  confidence: number | null;
};

type UseExpoSpeechSTTOptions = {
  lang: string;
  mode: 'cloud' | 'device' | 'auto';
  detect?: boolean;
  enabled?: boolean;
};

type UseExpoSpeechSTTReturn = {
  transcript: string;
  detectedLanguage: string | null;
  confidence: number | null;
  subtitle: SubtitleState | null;
  isActive: boolean;
  isInitializing: boolean;
  error: string | null;
  lastUpdatedAt: number | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  reset: () => Promise<void>;
};

const cleanText = (value: string) => value.replace(/\s+/g, ' ').trim();

const normalizeConfidence = (value: number | undefined) => {
  if (typeof value !== 'number') {
    return null;
  }
  if (value < 0) {
    return null;
  }
  return value;
};

export const useExpoSpeechSTT = (options: UseExpoSpeechSTTOptions): UseExpoSpeechSTTReturn => {
  const [transcript, setTranscript] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [subtitle, setSubtitle] = useState<SubtitleState | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  const runRef = useRef(false);
  const langRef = useRef(options.lang);
  const modeRef = useRef(options.mode);
  const detectRef = useRef<boolean>(Boolean(options.detect));
  const langStateRef = useRef<string | null>(null);

  useEffect(() => {
    langRef.current = options.lang;
  }, [options.lang]);

  useEffect(() => {
    modeRef.current = options.mode;
  }, [options.mode]);

  useEffect(() => {
    detectRef.current = Boolean(options.detect);
  }, [options.detect]);

  const applyDetectedLanguage = useCallback((value: string | null) => {
    langStateRef.current = value;
    setDetectedLanguage(value);
  }, []);

  const stop = useCallback(async () => {
    if (!runRef.current) {
      try {
        await ExpoSpeechRecognitionModule.stop();
      } catch (error) {
      }
      try {
        await ExpoSpeechRecognitionModule.abort();
      } catch (error) {
      }
      setIsActive(false);
      setIsInitializing(false);
      return;
    }
    runRef.current = false;
    setIsActive(false);
    setIsInitializing(false);
    try {
      await ExpoSpeechRecognitionModule.stop();
    } catch (error) {
    }
    try {
      await ExpoSpeechRecognitionModule.abort();
    } catch (error) {
    }
  }, []);

  const reset = useCallback(async () => {
    await stop();
    setTranscript('');
    setSubtitle(null);
    applyDetectedLanguage(null);
    setConfidence(null);
    setError(null);
    setLastUpdatedAt(null);
  }, [applyDetectedLanguage, stop]);

  const start = useCallback(async () => {
    if (runRef.current) {
      return;
    }
    setError(null);
    setIsInitializing(true);
    const perm = await ExpoSpeechRecognitionModule.getPermissionsAsync();
    if (!perm.granted) {
      const ask = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!ask.granted) {
        setIsInitializing(false);
        setError('Speech recognition permission denied');
        throw new Error('Speech recognition permission denied');
      }
    }
    const supports = ExpoSpeechRecognitionModule.supportsOnDeviceRecognition();
    let requireDevice = false;
    if (modeRef.current === 'device') {
      if (!supports) {
        setIsInitializing(false);
        setError('On-device recognition unavailable');
        throw new Error('On-device recognition unavailable');
      }
      requireDevice = true;
    } else if (modeRef.current === 'auto') {
      requireDevice = supports;
    }
    const detectEnabled = detectRef.current && requireDevice && Platform.OS === 'android';
    const config: Record<string, unknown> = {
      lang: langRef.current,
      interimResults: true,
      continuous: true,
      maxAlternatives: 1,
    };
    if (requireDevice) {
      config.requiresOnDeviceRecognition = true;
    }
    if (detectEnabled) {
      config.androidRecognitionServicePackage = EXPO_ON_DEVICE_SERVICE;
      config.androidIntentOptions = {
        EXTRA_ENABLE_LANGUAGE_DETECTION: true,
        EXTRA_ENABLE_LANGUAGE_SWITCH: true,
      };
    }
    runRef.current = true;
    applyDetectedLanguage(detectEnabled ? null : langRef.current);
    try {
      await ExpoSpeechRecognitionModule.start(config);
    } catch (err) {
      runRef.current = false;
      setIsInitializing(false);
      setIsActive(false);
      applyDetectedLanguage(null);
      throw err;
    }
  }, [applyDetectedLanguage]);

  const handleStart = useCallback(() => {
    if (!runRef.current) {
      return;
    }
    setIsActive(true);
    setIsInitializing(false);
  }, []);

  const handleEnd = useCallback(() => {
    if (!runRef.current) {
      return;
    }
    runRef.current = false;
    setIsActive(false);
    setIsInitializing(false);
  }, []);

  const handleResult = useCallback((event: ExpoSpeechRecognitionResultEvent) => {
    if (!runRef.current) {
      return;
    }
    if (!event.results || event.results.length === 0) {
      return;
    }
    const first = event.results[0];
    const text = cleanText(first.transcript || '');
    if (!text) {
      return;
    }
    const now = Date.now();
    const conf = normalizeConfidence(first.confidence);
    setTranscript(text);
    setConfidence(conf);
    setSubtitle({
      text,
      timestamp: now,
      isFinal: event.isFinal,
      language: langStateRef.current || langRef.current,
      confidence: conf,
    });
    setLastUpdatedAt(now);
  }, []);

  const handleError = useCallback((event: ExpoSpeechRecognitionErrorEvent) => {
    const message = event.message || event.error || 'Unknown error';
    setError(message);
    runRef.current = false;
    setIsActive(false);
    setIsInitializing(false);
  }, []);

  const handleLanguage = useCallback((value: { detectedLanguage: string }) => {
    if (!runRef.current) {
      return;
    }
    const lang = value.detectedLanguage || null;
    applyDetectedLanguage(lang);
  }, [applyDetectedLanguage]);

  useSpeechRecognitionEvent('start', handleStart);
  useSpeechRecognitionEvent('end', handleEnd);
  useSpeechRecognitionEvent('result', handleResult);
  useSpeechRecognitionEvent('error', handleError);
  useSpeechRecognitionEvent('languagedetection', handleLanguage);

  useEffect(() => {
    return () => {
      stop().catch(() => {});
    };
  }, [stop]);

  const autoEnabled = options.enabled;
  const hasAuto = typeof autoEnabled === 'boolean';

  useEffect(() => {
    if (!hasAuto) {
      return;
    }
    if (autoEnabled) {
      start().catch(() => {});
    } else {
      stop().catch(() => {});
    }
  }, [autoEnabled, hasAuto, start, stop]);

  return useMemo(
    () => ({
      transcript,
      detectedLanguage,
      confidence,
      subtitle,
      isActive,
      isInitializing,
      error,
      lastUpdatedAt,
      start,
      stop,
      reset,
    }),
    [confidence, detectedLanguage, error, isActive, isInitializing, lastUpdatedAt, reset, start, stop, subtitle, transcript],
  );
};

export default useExpoSpeechSTT;
