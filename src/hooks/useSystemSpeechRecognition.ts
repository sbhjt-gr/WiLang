import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  type ExpoSpeechRecognitionErrorEvent,
  type ExpoSpeechRecognitionOptions,
  type ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition';

type UseSystemSpeechRecognitionOptions = {
  enabled?: boolean;
  language?: string;
  allowedLanguages?: string[];
};

type SubtitleState = {
  text: string;
  timestamp: number;
  isFinal: boolean;
  language: string | null;
  confidence: number | null;
};

type UseSystemSpeechRecognitionReturn = {
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

const LANGUAGE_LOCALE_MAP: Record<string, string> = {
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

const sanitizeText = (value: string) => value.replace(/\s+/g, ' ').trim();

const shouldAppend = (text: string) => text.length > 0;

const mapLocaleToCode = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }
  const lower = value.toLowerCase();
  const [base] = lower.split('-');
  return base || lower;
};

const resolveLocale = (language?: string) => {
  if (!language || language === 'auto') {
    return undefined;
  }
  return LANGUAGE_LOCALE_MAP[language] || language;
};

const confidenceTimeoutMs = 500;

const useSystemSpeechRecognition = (
  options: UseSystemSpeechRecognitionOptions = {},
): UseSystemSpeechRecognitionReturn => {
  const [transcript, setTranscript] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [subtitle, setSubtitle] = useState<SubtitleState | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  const transcriptRef = useRef('');
  const languageRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const statusRef = useRef<'idle' | 'starting' | 'active' | 'stopping'>('idle');
  const confidenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const allowedSet = useMemo(() => {
    if (!options.allowedLanguages?.length) {
      return null;
    }
    return options.allowedLanguages.map(value => value.toLowerCase());
  }, [options.allowedLanguages]);

  const setErrorSafe = useCallback((message: string | null) => {
    if (!mountedRef.current) {
      return;
    }
    setError(message);
  }, []);

  const clearConfidenceLater = useCallback(() => {
    if (confidenceTimeoutRef.current) {
      clearTimeout(confidenceTimeoutRef.current);
    }
    confidenceTimeoutRef.current = setTimeout(() => {
      setConfidence(null);
      confidenceTimeoutRef.current = null;
    }, confidenceTimeoutMs);
  }, []);

  const ensurePermissions = useCallback(async () => {
    try {
      const current = await ExpoSpeechRecognitionModule.getPermissionsAsync();
      if (current.granted) {
        return true;
      }
      const next = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      return Boolean(next.granted);
    } catch (permError) {
      const message = permError instanceof Error ? permError.message : 'Speech recognition permission error';
      setErrorSafe(message);
      return false;
    }
  }, [setErrorSafe]);

  const handleResult = useCallback(
    (event: ExpoSpeechRecognitionResultEvent) => {
      if (!event.results?.length) {
        return;
      }
      const primary = event.results[0];
      if (!primary?.transcript) {
        return;
      }
      const text = sanitizeText(primary.transcript);
      if (!shouldAppend(text)) {
        return;
      }
      const confidenceValue = typeof primary.confidence === 'number' && primary.confidence >= 0 ? primary.confidence : null;
      if (confidenceValue !== null) {
        setConfidence(confidenceValue);
        if (event.isFinal) {
          clearConfidenceLater();
        }
      }
      const state: SubtitleState = {
        text,
        timestamp: Date.now(),
        isFinal: event.isFinal,
        language: languageRef.current,
        confidence: confidenceValue,
      };
      setSubtitle(state);
      setLastUpdatedAt(state.timestamp);
      if (event.isFinal) {
        transcriptRef.current = transcriptRef.current ? `${transcriptRef.current}\n${text}` : text;
        setTranscript(transcriptRef.current);
      }
    },
    [clearConfidenceLater],
  );

  const handleError = useCallback(
    (event: ExpoSpeechRecognitionErrorEvent) => {
      statusRef.current = 'idle';
      setIsActive(false);
      const message = event?.message || 'Speech recognition error';
      setErrorSafe(message);
    },
    [setErrorSafe],
  );

  const handleStart = useCallback(() => {
    setIsActive(true);
    statusRef.current = 'active';
  }, []);

  const handleEnd = useCallback(() => {
    statusRef.current = 'idle';
    setIsActive(false);
    clearConfidenceLater();
  }, [clearConfidenceLater]);

  const handleLanguageDetection = useCallback(
    (event: { detectedLanguage: string }) => {
      const code = mapLocaleToCode(event.detectedLanguage);
      if (!code) {
        return;
      }
      if (allowedSet && !allowedSet.includes(code)) {
        return;
      }
      languageRef.current = code;
      setDetectedLanguage(code);
    },
    [allowedSet],
  );

  const handleSpeechEnd = useCallback(() => {
    clearConfidenceLater();
  }, [clearConfidenceLater]);

  useSpeechRecognitionEvent('result', handleResult);
  useSpeechRecognitionEvent('error', handleError);
  useSpeechRecognitionEvent('start', handleStart);
  useSpeechRecognitionEvent('end', handleEnd);
  useSpeechRecognitionEvent('speechend', handleSpeechEnd);
  useSpeechRecognitionEvent('languagedetection', handleLanguageDetection);

  const start = useCallback(async () => {
    if (statusRef.current === 'starting' || statusRef.current === 'active') {
      return;
    }
    statusRef.current = 'starting';
    setErrorSafe(null);
    setIsInitializing(true);
    try {
      const granted = await ensurePermissions();
      if (!granted) {
        throw new Error('Speech recognition permissions denied');
      }
      const locale = resolveLocale(options.language);
      const startOptions: ExpoSpeechRecognitionOptions = {
        interimResults: true,
        continuous: true,
      };
      if (locale) {
        startOptions.lang = locale;
      }
      ExpoSpeechRecognitionModule.start(startOptions);
      setIsInitializing(false);
      setIsActive(true);
      statusRef.current = 'active';
    } catch (startError) {
      statusRef.current = 'idle';
      setIsInitializing(false);
      setIsActive(false);
      const message = startError instanceof Error ? startError.message : 'Speech recognition start failed';
      setErrorSafe(message);
      throw startError;
    }
  }, [ensurePermissions, options.language, setErrorSafe]);

  const stop = useCallback(async () => {
    if (statusRef.current === 'stopping' || statusRef.current === 'idle') {
      return;
    }
    statusRef.current = 'stopping';
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch (stopError) {
      const message = stopError instanceof Error ? stopError.message : 'Speech recognition stop failed';
      setErrorSafe(message);
    } finally {
      statusRef.current = 'idle';
      setIsActive(false);
    }
  }, [setErrorSafe]);

  const reset = useCallback(async () => {
    await stop();
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch {
    }
    if (confidenceTimeoutRef.current) {
      clearTimeout(confidenceTimeoutRef.current);
      confidenceTimeoutRef.current = null;
    }
    transcriptRef.current = '';
    languageRef.current = null;
    setTranscript('');
    setDetectedLanguage(null);
    setConfidence(null);
    setSubtitle(null);
    setLastUpdatedAt(null);
    setErrorSafe(null);
    statusRef.current = 'idle';
    setIsActive(false);
  }, [setErrorSafe, stop]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (confidenceTimeoutRef.current) {
        clearTimeout(confidenceTimeoutRef.current);
      }
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {
      }
    };
  }, []);

  useEffect(() => {
    if (!options.language || options.language === 'auto') {
      languageRef.current = null;
      setDetectedLanguage(null);
      return;
    }
    const code = mapLocaleToCode(options.language);
    if (!code) {
      languageRef.current = null;
      setDetectedLanguage(null);
      return;
    }
    languageRef.current = code;
    setDetectedLanguage(code);
  }, [options.language]);

  const hasAutoControl = typeof options.enabled === 'boolean';

  useEffect(() => {
    if (!hasAutoControl) {
      return;
    }
    if (options.enabled) {
      start().catch(() => {});
    } else {
      stop().catch(() => {});
    }
  }, [hasAutoControl, options.enabled, start, stop]);

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

export default useSystemSpeechRecognition;
