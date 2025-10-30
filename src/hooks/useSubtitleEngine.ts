import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	ExpoSpeechRecognitionModule,
	useSpeechRecognitionEvent,
	type ExpoSpeechRecognitionResultEvent,
	type ExpoSpeechRecognitionErrorEvent,
	type ExpoSpeechRecognitionOptions,
} from 'expo-speech-recognition';
import { EXPO_ON_DEVICE_SERVICE, type ExpoSpeechMode } from '../services/SubtitlePreferences';

type SubtitleItem = {
	text: string;
	timestamp: number;
	isFinal: boolean;
	confidence: number | null;
};

type UseSubtitleEngineOptions = {
	enabled: boolean;
	locale: string;
	mode: ExpoSpeechMode;
	detect: boolean;
	audioSourceUri?: string | null;
};

const cleanConfidence = (val?: number) => {
	if (typeof val !== 'number') {
		return null;
	}
	if (val < 0) {
		return null;
	}
	return val;
};

const useSubtitleEngine = (opts: UseSubtitleEngineOptions) => {
	const [subtitle, setSubtitle] = useState<SubtitleItem | null>(null);
	const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
	const [confidence, setConfidence] = useState<number | null>(null);
	const [isActive, setIsActive] = useState(false);
	const [isInitializing, setIsInitializing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const runRef = useRef(false);

	useSpeechRecognitionEvent(
		'result',
		useCallback((ev: ExpoSpeechRecognitionResultEvent) => {
			if (!runRef.current) {
				return;
			}
			const first = ev.results[0];
			if (!first) {
				return;
			}
			const conf = cleanConfidence(first.confidence);
			setConfidence(conf);
			setSubtitle({
				text: first.transcript,
				timestamp: Date.now(),
				isFinal: ev.isFinal,
				confidence: conf,
			});
		}, []),
	);

	useSpeechRecognitionEvent(
		'error',
		useCallback((ev: ExpoSpeechRecognitionErrorEvent) => {
			runRef.current = false;
			setIsActive(false);
			setIsInitializing(false);
			setError(ev.message || ev.error);
		}, []),
	);

	useSpeechRecognitionEvent(
		'languagedetection',
		useCallback(ev => {
			setDetectedLanguage(ev.detectedLanguage);
		}, []),
	);

	const start = useCallback(async () => {
		if (runRef.current) {
			return;
		}
		setError(null);
		setIsInitializing(true);
		const opt: ExpoSpeechRecognitionOptions = {
			lang: opts.locale,
			interimResults: true,
			maxAlternatives: 1,
			continuous: true,
			addsPunctuation: true,
		};
		if (opts.mode === 'device') {
			opt.requiresOnDeviceRecognition = true;
			opt.androidRecognitionServicePackage = EXPO_ON_DEVICE_SERVICE;
		}
		if (opts.mode === 'auto') {
			opt.requiresOnDeviceRecognition = false;
			opt.androidRecognitionServicePackage = EXPO_ON_DEVICE_SERVICE;
		}
		if (opts.audioSourceUri) {
			opt.audioSource = {
				uri: opts.audioSourceUri,
				audioChannels: 1,
				audioEncoding: 'pcm_s16le',
				sampleRate: 16000,
			};
		}
		try {
			await ExpoSpeechRecognitionModule.start(opt);
			runRef.current = true;
			setIsActive(true);
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'start_failed';
			setError(msg);
			runRef.current = false;
			setIsActive(false);
		} finally {
			setIsInitializing(false);
		}
	}, [opts.detect, opts.locale, opts.mode, opts.audioSourceUri]);

	const stop = useCallback(async () => {
		if (!runRef.current) {
			return;
		}
		runRef.current = false;
		setIsActive(false);
		try {
			await ExpoSpeechRecognitionModule.stop();
		} catch (err) {}
		try {
			await ExpoSpeechRecognitionModule.abort();
		} catch (err) {}
	}, []);

	const reset = useCallback(async () => {
		await stop();
		setSubtitle(null);
		setDetectedLanguage(null);
		setConfidence(null);
		setError(null);
	}, [stop]);

	useEffect(() => {
		if (!opts.enabled && runRef.current) {
			stop();
		}
	}, [opts.enabled, stop]);

	return useMemo(
		() => ({
			subtitle,
			detectedLanguage,
			confidence,
			isActive,
			isInitializing,
			error,
			start,
			stop,
			reset,
		}),
		[confidence, detectedLanguage, error, isActive, isInitializing, reset, start, stop, subtitle],
	);
};

export default useSubtitleEngine;
