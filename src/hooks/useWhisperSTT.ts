import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import DeviceInfo from 'react-native-device-info';
import { initWhisper, initWhisperVad, type WhisperContext, type WhisperVadContext } from 'whisper.rn';
import { RealtimeTranscriber, VAD_PRESETS, type RealtimeTranscribeEvent, type RealtimeVadEvent } from 'whisper.rn/realtime-transcription';
import { AudioPcmStreamAdapter } from 'whisper.rn/realtime-transcription/adapters/AudioPcmStreamAdapter';

type WhisperModelVariant = 'tiny' | 'base' | 'small' | 'medium' | 'large-v3';

type WhisperModelKey = WhisperModelVariant | 'vad';

type UseWhisperSTTOptions = {
  enabled?: boolean;
  modelVariant?: WhisperModelVariant;
  vadPreset?: keyof typeof VAD_PRESETS;
  language?: string;
  translate?: boolean;
  allowedLanguages?: string[];
  modelUrls?: Partial<Record<WhisperModelKey, string>>;
};

type SubtitleState = {
  text: string;
  timestamp: number;
  isFinal: boolean;
  language: string | null;
  confidence: number | null;
};

type WhisperRuntime = {
  whisperContext: WhisperContext;
  vadContext: WhisperVadContext;
  audioAdapter: AudioPcmStreamAdapter;
  transcriber: RealtimeTranscriber;
};

type UseWhisperSTTReturn = {
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

const MODEL_METADATA: Record<WhisperModelKey, { fileName: string; minBytes: number; downloadUrl: string }> = {
  vad: {
    fileName: 'ggml-silero-v5.1.2.bin',
    minBytes: Math.floor(885 * 1024 * 0.95),
    downloadUrl: 'https://huggingface.co/ggml-org/whisper-vad/resolve/main/ggml-silero-v5.1.2.bin'
  },
  tiny: {
    fileName: 'ggml-tiny-q5_1.bin',
    minBytes: Math.floor(31 * 1024 * 1024 * 0.95),
    downloadUrl: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny-q5_1.bin'
  },
  base: {
    fileName: 'ggml-base-q5_1.bin',
    minBytes: Math.floor(58 * 1024 * 1024 * 0.95),
    downloadUrl: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base-q5_1.bin'
  },
  small: {
    fileName: 'ggml-small-q5_1.bin',
    minBytes: Math.floor(190 * 1024 * 1024 * 0.95),
    downloadUrl: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-q5_1.bin'
  },
  medium: {
    fileName: 'ggml-medium-q5_0.bin',
    minBytes: Math.floor(539 * 1024 * 1024 * 0.95),
    downloadUrl: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium-q5_0.bin'
  },
  'large-v3': {
    fileName: 'ggml-large-v3-q5_0.bin',
    minBytes: Math.floor(1080 * 1024 * 1024 * 0.95),
    downloadUrl: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-q5_0.bin'
  },
};

const DEFAULT_THREADS_LOW = 2;
const DEFAULT_THREADS_MEDIUM = 4;
const DEFAULT_THREADS_HIGH = 6;

const getWritableRoot = () => {
  const base = FileSystem.documentDirectory || FileSystem.cacheDirectory;
  if (!base) {
    throw new Error('No writable directory available for Whisper models');
  }
  return `${base.replace(/\/$/, '')}/whisper`;
};

const resolveModelUrl = (
  key: WhisperModelKey,
  overrides?: Partial<Record<WhisperModelKey, string>>,
) => {
  if (overrides?.[key]) {
    return overrides[key];
  }
  return MODEL_METADATA[key].downloadUrl;
};

const estimateThreadCount = () => {
  try {
    if (DeviceInfo.isLowRamDevice()) {
      return DEFAULT_THREADS_LOW;
    }
  } catch (error) {
  }
  try {
    const total = DeviceInfo.getTotalMemorySync?.() || 0;
    if (total >= 8 * 1024 * 1024 * 1024) {
      return DEFAULT_THREADS_HIGH;
    }
    if (total >= 4 * 1024 * 1024 * 1024) {
      return DEFAULT_THREADS_MEDIUM;
    }
    if (total >= 2 * 1024 * 1024 * 1024) {
      return DEFAULT_THREADS_LOW;
    }
  } catch (error) {
  }
  return DEFAULT_THREADS_LOW;
};

const extractLanguage = (event: RealtimeTranscribeEvent, fallback: string | null) => {
  const payload = event.data as Record<string, any> | undefined;
  const lang = payload?.language || payload?.lang || payload?.detectedLanguage;
  if (typeof lang === 'string' && lang.length > 0) {
    return lang;
  }
  return fallback;
};

const sanitizeText = (value: string) => {
  return value.replace(/\s+/g, ' ').trim();
};

const shouldAppend = (text: string) => {
  return text.length > 0;
};

const ensureDirectory = async (path: string) => {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  }
};

const checkModel = async (key: WhisperModelKey): Promise<string> => {
  const root = getWritableRoot();
  await ensureDirectory(root);
  const metadata = MODEL_METADATA[key];
  const path = `${root}/${metadata.fileName}`;
  const info = await FileSystem.getInfoAsync(path);

  if (!info.exists) {
    throw new Error(`Model ${key} not found. Please download it from the Models screen.`);
  }

  if (metadata.minBytes > 0 && (info.size || 0) < metadata.minBytes) {
    throw new Error(`Model ${key} is incomplete. Please re-download it from the Models screen.`);
  }

  return path;
};

export const useWhisperSTT = (options: UseWhisperSTTOptions = {}): UseWhisperSTTReturn => {
  const [transcript, setTranscript] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [subtitle, setSubtitle] = useState<SubtitleState | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  const runtimeRef = useRef<WhisperRuntime | null>(null);
  const statusRef = useRef<'idle' | 'starting' | 'active' | 'stopping'>('idle');
  const transcriptBufferRef = useRef('');
  const languageRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  const modelVariant = options.modelVariant || 'small';
  const vadPreset = options.vadPreset || 'meeting';
  const language = options.language || 'auto';
  const translate = options.translate || false;
  const allowedLanguages = options.allowedLanguages;

  const setErrorSafe = useCallback((message: string | null) => {
    if (!mountedRef.current) {
      return;
    }
    setError(message);
  }, []);

  const setStateAfterEvent = useCallback(
    (nextText: string, isFinal: boolean, vadEvent: RealtimeVadEvent | undefined, rawLanguage: string | null) => {
      const updated = sanitizeText(nextText);
      const nextConfidence = vadEvent?.confidence ?? null;
      const nextLanguage = rawLanguage;
      if (nextLanguage && (!allowedLanguages || allowedLanguages.includes(nextLanguage))) {
        if (languageRef.current !== nextLanguage) {
          languageRef.current = nextLanguage;
          setDetectedLanguage(nextLanguage);
        }
      }
      if (nextConfidence !== null) {
        setConfidence(nextConfidence);
      }
      if (!shouldAppend(updated)) {
        return;
      }
      const state: SubtitleState = {
        text: updated,
        timestamp: Date.now(),
        isFinal,
        language: languageRef.current,
        confidence: nextConfidence,
      };
      setSubtitle(state);
      setLastUpdatedAt(state.timestamp);
      if (isFinal) {
        transcriptBufferRef.current = transcriptBufferRef.current
          ? `${transcriptBufferRef.current}\n${updated}`
          : updated;
        setTranscript(transcriptBufferRef.current);
      }
    },
    [allowedLanguages],
  );

  const handleTranscribeEvent = useCallback(
    (event: RealtimeTranscribeEvent) => {
      if (!event.data) {
        return;
      }
      const rawLang = extractLanguage(event, languageRef.current);
      setStateAfterEvent(event.data.result || '', event.type === 'end' || !event.isCapturing, event.vadEvent, rawLang);
    },
    [setStateAfterEvent],
  );

  const handleVadEvent = useCallback((event: RealtimeVadEvent) => {
    if (event.confidence !== undefined && event.confidence !== null) {
      setConfidence(event.confidence);
    }
  }, []);

  const releaseRuntime = useCallback(async () => {
    const runtime = runtimeRef.current;
  runtimeRef.current = null;
    if (!runtime) {
      return;
    }
    try {
      await runtime.transcriber.release();
    } catch (releaseError) {
    }
    try {
      await runtime.vadContext.release();
    } catch (releaseError) {
    }
    try {
      await runtime.whisperContext.release();
    } catch (releaseError) {
    }
  }, []);

  const createRuntime = useCallback(async (): Promise<RealtimeTranscriber> => {
    if (runtimeRef.current) {
      return runtimeRef.current.transcriber;
    }
    setIsInitializing(true);
    setErrorSafe(null);
    try {
      const modelPath = await checkModel(modelVariant);
      const vadPath = await checkModel('vad');
      const context = await initWhisper({
        filePath: modelPath,
        isBundleAsset: false,
        useGpu: Platform.OS === 'ios',
        useCoreMLIos: Platform.OS === 'ios',
      });
      const threads = estimateThreadCount();
      const vadContext = await initWhisperVad({
        filePath: vadPath,
        isBundleAsset: false,
        useGpu: Platform.OS === 'ios',
        nThreads: threads,
      });
      const audioAdapter = new AudioPcmStreamAdapter();
      const transcriber = new RealtimeTranscriber(
        {
          whisperContext: context,
          vadContext,
          audioStream: audioAdapter,
        },
        {
          audioSliceSec: 12,
          audioMinSec: 0.9,
          maxSlicesInMemory: 2,
          vadPreset,
          vadOptions: VAD_PRESETS[vadPreset],
          autoSliceOnSpeechEnd: true,
          autoSliceThreshold: 0.35,
          promptPreviousSlices: false,
          transcribeOptions: {
            language,
            translate,
            maxThreads: threads,
          },
          logger: () => {},
        },
        {
          onTranscribe: handleTranscribeEvent,
          onVad: handleVadEvent,
          onError: (message: string) => {
            setErrorSafe(message);
          },
          onStatusChange: (active: boolean) => {
            setIsActive(active);
            if (!active) {
              statusRef.current = 'idle';
            }
          },
        },
      );
      runtimeRef.current = {
        whisperContext: context,
        vadContext,
        audioAdapter,
        transcriber,
      };
      setIsInitializing(false);
      return transcriber;
    } catch (runtimeError: any) {
      setIsInitializing(false);
      const message = runtimeError?.message || 'Failed to initialize Whisper runtime';
      setErrorSafe(message);
      throw runtimeError;
    }
  }, [handleTranscribeEvent, handleVadEvent, language, modelVariant, options.modelUrls, translate, vadPreset, setErrorSafe]);

  const start = useCallback(async () => {
    if (statusRef.current === 'starting' || statusRef.current === 'active') {
      return;
    }
    statusRef.current = 'starting';
    try {
      const transcriber = await createRuntime();
      await transcriber.start();
      statusRef.current = 'active';
      setIsActive(true);
    } catch (startError) {
      statusRef.current = 'idle';
      throw startError;
    }
  }, [createRuntime]);

  const stop = useCallback(async () => {
    if (statusRef.current === 'stopping' || statusRef.current === 'idle') {
      return;
    }
    statusRef.current = 'stopping';
    try {
      await runtimeRef.current?.transcriber.stop();
    } catch (stopError) {
    } finally {
      statusRef.current = 'idle';
      setIsActive(false);
    }
  }, []);

  const reset = useCallback(async () => {
    await stop();
    await releaseRuntime();
    transcriptBufferRef.current = '';
    languageRef.current = null;
    setTranscript('');
    setDetectedLanguage(null);
    setConfidence(null);
    setSubtitle(null);
    setLastUpdatedAt(null);
    setErrorSafe(null);
  }, [releaseRuntime, setErrorSafe, stop]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stop().catch(() => {});
      releaseRuntime().catch(() => {});
    };
  }, [releaseRuntime, stop]);

  const autoEnabled = options.enabled;
  const hasAutoControl = typeof autoEnabled === 'boolean';

  useEffect(() => {
    if (!hasAutoControl) {
      return;
    }
    if (autoEnabled) {
      start().catch(() => {});
    } else {
      stop().catch(() => {});
    }
  }, [autoEnabled, hasAutoControl, start, stop]);

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

export default useWhisperSTT;
