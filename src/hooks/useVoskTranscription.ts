import {useCallback, useEffect, useRef, useState} from 'react';
import * as vosk from 'react-native-vosk';

type Transcription = {
  text: string;
  timestamp: number;
  isFinal: boolean;
  peerId?: string;
};

type Options = {
  model: string;
  enabled: boolean;
  grammar?: string[];
  onTranscription?: (result: Transcription) => void;
};

type ListenerMap = {
  result?: {remove(): void};
  partial?: {remove(): void};
  final?: {remove(): void};
  error?: {remove(): void};
  timeout?: {remove(): void};
};

export function useVoskTranscription({model, enabled, grammar, onTranscription}: Options) {
  const [isReady, setIsReady] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listenersRef = useRef<ListenerMap>({});
  const loadPromiseRef = useRef<Promise<void> | null>(null);

  const detachListeners = useCallback(() => {
    const listeners = listenersRef.current;
    if (listeners.result) listeners.result.remove();
    if (listeners.partial) listeners.partial.remove();
    if (listeners.final) listeners.final.remove();
    if (listeners.error) listeners.error.remove();
    if (listeners.timeout) listeners.timeout.remove();
    listenersRef.current = {};
  }, []);

  const ensureModel = useCallback(async () => {
    if (isReady) return;
    if (loadPromiseRef.current) {
      await loadPromiseRef.current;
      return;
    }
    const loadTask = (async () => {
      setIsLoading(true);
      try {
        await vosk.loadModel(model);
        setIsReady(true);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'vosk_load_failed';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
        loadPromiseRef.current = null;
      }
    })();
    loadPromiseRef.current = loadTask;
    await loadTask;
  }, [isReady, model]);

  const start = useCallback(async () => {
    if (!enabled) return;
    if (isActive) return;
    try {
      await ensureModel();
    } catch {
      return;
    }
    detachListeners();
    listenersRef.current.result = vosk.onResult((text) => {
      if (!text) return;
      onTranscription?.({text, timestamp: Date.now(), isFinal: true});
    });
    listenersRef.current.partial = vosk.onPartialResult((text) => {
      if (!text) return;
      onTranscription?.({text, timestamp: Date.now(), isFinal: false});
    });
    listenersRef.current.error = vosk.onError((err) => {
      const message = err instanceof Error ? err.message : String(err ?? 'vosk_error');
      setError(message);
    });
    listenersRef.current.timeout = vosk.onTimeout(() => {
      setIsActive(false);
    });
    try {
      if (grammar && grammar.length > 0) {
        await vosk.start({grammar});
      } else {
        await vosk.start();
      }
      setIsActive(true);
    } catch (err) {
      detachListeners();
      const message = err instanceof Error ? err.message : 'vosk_start_failed';
      setError(message);
    }
  }, [detachListeners, enabled, ensureModel, grammar, isActive, onTranscription]);

  const stop = useCallback(async () => {
    if (!isActive) return;
    try {
      await Promise.resolve(vosk.stop());
    } finally {
      detachListeners();
      setIsActive(false);
    }
  }, [detachListeners, isActive]);

  const reset = useCallback(async () => {
    detachListeners();
    if (isActive) {
      await Promise.resolve(vosk.stop());
      setIsActive(false);
    }
    if (isReady) {
      await Promise.resolve(vosk.unload());
      setIsReady(false);
    }
  }, [detachListeners, isActive, isReady]);

  useEffect(() => {
    if (!enabled) {
      stop();
    }
  }, [enabled, stop]);

  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  return {
    start,
    stop,
    reset,
    isReady,
    isActive,
    isLoading,
    error,
  };
}

export type {Transcription};
