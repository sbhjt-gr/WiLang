import { useCallback, useEffect, useRef, useState } from 'react';
import { useSpeechRecognitionEvent, ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

type SubtitleSegment = {
  id: string;
  text: string;
  timestamp: number;
};

type HookStatus = 'idle' | 'preparing' | 'ready' | 'running' | 'error';

type UseNativeSpeechRecognitionOptions = {
  language?: string;
};

const SUBTITLE_TTL_MS = 15000;

const pruneSegments = (segments: SubtitleSegment[]) => {
  const now = Date.now();
  return segments.filter((segment) => now - segment.timestamp <= SUBTITLE_TTL_MS);
};

export const useNativeSpeechRecognition = (
  active: boolean,
  options?: UseNativeSpeechRecognitionOptions,
) => {
  const [segments, setSegments] = useState<SubtitleSegment[]>([]);
  const [status, setStatus] = useState<HookStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const unmountedRef = useRef(false);

  useSpeechRecognitionEvent('result', (event) => {
    if (unmountedRef.current) {
      return;
    }
    const transcript = event.results[0]?.transcript;
    if (transcript && transcript.trim()) {
      setSegments((prev) => {
        const base = pruneSegments(prev);
        const last = base[base.length - 1];
        if (last && last.text === transcript) {
          return base;
        }
        return [...base, { id: `${Date.now()}`, text: transcript, timestamp: Date.now() }];
      });
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (unmountedRef.current) {
      return;
    }
    console.log('native_speech_error', event.error);
    setError(event.error || 'Speech recognition error');
    setStatus('error');
  });

  useSpeechRecognitionEvent('end', () => {
    if (unmountedRef.current) {
      return;
    }
    setIsRecognizing(false);
    if (active) {
      startRecognition();
    }
  });

  const startRecognition = useCallback(async () => {
    if (isRecognizing || unmountedRef.current) {
      return;
    }
    try {
      setError(null);
      setStatus('preparing');
      const language = options?.language ?? 'en-US';

      await ExpoSpeechRecognitionModule.start({
        lang: language,
        interimResults: true,
        maxAlternatives: 1,
        continuous: true,
        requiresOnDeviceRecognition: false,
        addsPunctuation: true,
        contextualStrings: [],
      });

      setIsRecognizing(true);
      setStatus('running');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log('native_speech_start_error', message);
      setError(message);
      setStatus('error');
    }
  }, [isRecognizing, options?.language, active]);

  const stopRecognition = useCallback(async () => {
    if (!isRecognizing) {
      return;
    }
    try {
      await ExpoSpeechRecognitionModule.stop();
      setIsRecognizing(false);
      setStatus('idle');
    } catch {}
  }, [isRecognizing]);

  useEffect(() => {
    if (active) {
      startRecognition();
    } else {
      stopRecognition();
    }
  }, [active, startRecognition, stopRecognition]);

  useEffect(() => {
    return () => {
      unmountedRef.current = true;
      stopRecognition();
    };
  }, [stopRecognition]);

  useEffect(() => {
    if (!active) {
      setSegments([]);
    }
  }, [active]);

  return {
    segments,
    status,
    error,
    start: startRecognition,
    stop: stopRecognition,
  };
};
