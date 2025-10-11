import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { initWhisper, initWhisperVad } from 'whisper.rn';
import type { WhisperContext, WhisperVadContext } from 'whisper.rn';
import type { RealtimeTranscribeEvent } from 'whisper.rn/realtime-transcription';
type RealtimeTranscriberCtor = typeof import('whisper.rn/realtime-transcription').RealtimeTranscriber;
type AudioPcmStreamAdapterCtor = typeof import('whisper.rn/realtime-transcription/adapters/AudioPcmStreamAdapter').AudioPcmStreamAdapter;
import { clearManualModel, clearManualVad, getCachedModelSettings, subscribeModelSettings, type ModelSettings } from '../services/ModelSettings';

const { RealtimeTranscriber } = require('whisper.rn/lib/commonjs/realtime-transcription') as {
  RealtimeTranscriber: RealtimeTranscriberCtor;
};

const { AudioPcmStreamAdapter } = require('whisper.rn/lib/commonjs/realtime-transcription/adapters/AudioPcmStreamAdapter') as {
  AudioPcmStreamAdapter: AudioPcmStreamAdapterCtor;
};

const SUBTITLE_TTL_MS = 15000;
const STORAGE_DIR = `${RNFS.DocumentDirectoryPath}/whisperlang`;

type SubtitleSegment = {
  id: string;
  text: string;
  timestamp: number;
};

type HookStatus = 'idle' | 'preparing' | 'ready' | 'running' | 'error';

type UseRealtimeSubtitleOptions = {
  language?: string;
};

const toFileUri = (path: string) => {
  if (path.startsWith('file://')) return path;
  if (Platform.OS === 'android') return `file://${path}`;
  return `file://${path}`;
};

const ensureDirectory = async (path: string) => {
  const exists = await RNFS.exists(path);
  if (!exists) {
    await RNFS.mkdir(path);
  }
};

const pruneSegments = (segments: SubtitleSegment[]) => {
  const now = Date.now();
  return segments.filter((segment) => now - segment.timestamp <= SUBTITLE_TTL_MS);
};

export const useRealtimeSubtitle = (
  active: boolean,
  options?: UseRealtimeSubtitleOptions,
) => {
  const [segments, setSegments] = useState<SubtitleSegment[]>([]);
  const [status, setStatus] = useState<HookStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [modelSettings, setModelSettings] = useState<ModelSettings>(getCachedModelSettings());
  const whisperContextRef = useRef<WhisperContext | null>(null);
  const vadContextRef = useRef<WhisperVadContext | null>(null);
  const transcriberRef = useRef<InstanceType<RealtimeTranscriberCtor> | null>(null);
  const startPromiseRef = useRef<Promise<void> | null>(null);
  const stopPromiseRef = useRef<Promise<void> | null>(null);
  const unmountedRef = useRef(false);
  const activeModelPathRef = useRef<string | null>(null);
  const activeVadPathRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeModelSettings((settings) => {
      if (unmountedRef.current) {
        return;
      }
      setModelSettings(settings);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const stopTranscription = useCallback(
    async (releaseAll?: boolean) => {
      if (stopPromiseRef.current) {
        await stopPromiseRef.current;
        return;
      }
      stopPromiseRef.current = (async () => {
        if (transcriberRef.current) {
          try {
            await transcriberRef.current.stop();
          } catch {
          }
          try {
            await transcriberRef.current.release();
          } catch {
          }
        }
        transcriberRef.current = null;
        if (releaseAll) {
          if (whisperContextRef.current) {
            try {
              await whisperContextRef.current.release();
            } catch {
            }
          }
          whisperContextRef.current = null;
          if (vadContextRef.current) {
            try {
              await vadContextRef.current.release();
            } catch {
            }
          }
          vadContextRef.current = null;
          activeModelPathRef.current = null;
          activeVadPathRef.current = null;
          if (!unmountedRef.current) {
            setStatus('idle');
          }
        } else if (whisperContextRef.current && !unmountedRef.current) {
          setStatus('ready');
        }
      })().finally(() => {
        stopPromiseRef.current = null;
      });
      await stopPromiseRef.current;
    },
    [],
  );

  const startTranscription = useCallback(async () => {
    if (startPromiseRef.current) {
      await startPromiseRef.current;
      return;
    }
    startPromiseRef.current = (async () => {
      setError(null);
      setStatus((prev) => (prev === 'running' ? prev : 'preparing'));
      await ensureDirectory(STORAGE_DIR);
      let resolvedModelPath: string | null = null;
      let resolvedVadPath: string | null = null;
      if (modelSettings.manualModelPath) {
        const exists = await RNFS.exists(modelSettings.manualModelPath);
        if (exists) {
          resolvedModelPath = modelSettings.manualModelPath;
        } else {
          await clearManualModel();
          resolvedModelPath = null;
        }
      }
      if (modelSettings.manualVadPath) {
        const exists = await RNFS.exists(modelSettings.manualVadPath);
        if (exists) {
          resolvedVadPath = modelSettings.manualVadPath;
          console.log('vad_found', resolvedVadPath);
        } else {
          console.log('vad_missing', modelSettings.manualVadPath);
          await clearManualVad();
          resolvedVadPath = null;
        }
      }
      if (!resolvedModelPath) {
        await stopTranscription(true);
        throw new Error('Import a speech model to enable subtitles.');
      }
      if (!resolvedVadPath) {
        await stopTranscription(true);
        throw new Error('Import a detector model to enable subtitles.');
      }
      const vadLowerCasePath = resolvedVadPath.toLowerCase();
      if (!vadLowerCasePath.endsWith('.bin')) {
        console.log('vad_invalid_extension', resolvedVadPath);
        await stopTranscription(true);
        throw new Error('Detector must be a Silero ggml .bin file.');
      }

      if (!whisperContextRef.current || activeModelPathRef.current !== resolvedModelPath) {
        if (whisperContextRef.current) {
          try {
            await whisperContextRef.current.release();
          } catch {
          }
        }
        const ctx = await initWhisper({
          filePath: toFileUri(resolvedModelPath),
        });
        whisperContextRef.current = ctx;
        activeModelPathRef.current = resolvedModelPath;
      }
      if (!vadContextRef.current || activeVadPathRef.current !== resolvedVadPath) {
        if (vadContextRef.current) {
          try {
            await vadContextRef.current.release();
          } catch {
          }
        }
        const vadUri = toFileUri(resolvedVadPath);
        console.log('vad_uri', vadUri);
        const vadStat = await RNFS.stat(resolvedVadPath).catch(() => null);
        if (vadStat) {
          console.log('vad_size', String(vadStat.size));
        } else {
          console.log('vad_stat_fail');
        }
        console.log('vad_init_start');
        try {
          const vadCtx = await initWhisperVad({
            filePath: vadUri,
            useGpu: true,
          });
          vadContextRef.current = vadCtx;
          activeVadPathRef.current = resolvedVadPath;
          console.log('vad_init_ok');
        } catch (err) {
          console.log('vad_init_error', err instanceof Error ? err.message : String(err));
          throw err;
        }
      }
      if (transcriberRef.current) {
        try {
          await transcriberRef.current.stop();
        } catch {
        }
        try {
          await transcriberRef.current.release();
        } catch {
        }
      }
  const audioStream = new AudioPcmStreamAdapter();
      const language = options?.language ?? 'en';
      const transcriber = new RealtimeTranscriber(
        {
          whisperContext: whisperContextRef.current,
          vadContext: vadContextRef.current,
          audioStream,
          fs: RNFS,
        },
        {
          audioSliceSec: 12,
          audioMinSec: 1,
          vadPreset: 'default',
          autoSliceOnSpeechEnd: true,
          autoSliceThreshold: 0.6,
          transcribeOptions: {
            language,
            translate: false,
          },
        },
        {
          onTranscribe: (event: RealtimeTranscribeEvent) => {
            if (event.type !== 'transcribe') {
              return;
            }
            const result = event.data?.result?.trim();
            if (!result) {
              return;
            }
            setSegments((prev) => {
              const base = pruneSegments(prev);
              const last = base[base.length - 1];
              if (last && last.text === result) {
                return base;
              }
              return [...base, { id: `${event.sliceIndex}-${Date.now()}`, text: result, timestamp: Date.now() }];
            });
          },
          onError: (message: string | Error) => {
            if (unmountedRef.current) {
              return;
            }
            setError(typeof message === 'string' ? message : 'Transcription error');
            setStatus('error');
          },
          onStatusChange: (isActive: boolean) => {
            if (unmountedRef.current) {
              return;
            }
            setStatus(isActive ? 'running' : 'ready');
          },
        },
      );
      transcriberRef.current = transcriber;
      await transcriber.start();
      if (!unmountedRef.current) {
        setStatus('running');
      }
    })()
      .catch((err) => {
        if (unmountedRef.current) {
          return;
        }
        setError(err instanceof Error ? err.message : String(err));
        setStatus('error');
        throw err;
      })
      .finally(() => {
        startPromiseRef.current = null;
      });
    await startPromiseRef.current;
  }, [modelSettings, options?.language, stopTranscription]);

  useEffect(() => {
    if (active) {
      startTranscription();
    } else {
      stopTranscription();
    }
  }, [active, startTranscription, stopTranscription]);

  useEffect(() => {
    return () => {
      unmountedRef.current = true;
      stopTranscription(true);
    };
  }, [stopTranscription]);

  useEffect(() => {
    if (!active) {
      setSegments([]);
    }
  }, [active]);

  const latestSubtitle = useMemo(() => {
    if (segments.length === 0) {
      return '';
    }
    return segments[segments.length - 1].text;
  }, [segments]);

  return {
    subtitle: latestSubtitle,
    segments,
    status,
    error,
    start: startTranscription,
    stop: stopTranscription,
  };
};
