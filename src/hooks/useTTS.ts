import { useCallback, useEffect, useRef, useState } from 'react';
import * as Speech from 'expo-speech';
import { TTSPreferences } from '../services/TTSPreferences';
import { getTTSLanguage } from '../constants/ttsLanguages';
import type { TranslationLang } from '../services/TranslationPreferences';

export type UseTTSOptions = {
	enabled: boolean;
	targetLanguage: TranslationLang | string | null | undefined;
	autoSpeak?: boolean;
};

export type UseTTSReturn = {
	speak: (text: string, language?: string) => Promise<void>;
	stop: () => void;
	pause: () => void;
	resume: () => void;
	isSpeaking: boolean;
	isPaused: boolean;
	error: string | null;
	rate: number;
	pitch: number;
	volume: number;
	ttsLanguage: string | null;
	reloadPreferences: () => Promise<void>;
};

let speechQueue: string | null = null;
let currentSpeechTimeout: NodeJS.Timeout | null = null;

export const useTTS = (options: UseTTSOptions): UseTTSReturn => {
	const [isSpeaking, setIsSpeaking] = useState(false);
	const [isPaused, setIsPaused] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [rate, setRate] = useState(1.0);
	const [pitch, setPitch] = useState(1.0);
	const [volume, setVolume] = useState(1.0);
	const [ttsLanguage, setTTSLanguage] = useState<string | null>(null);

	const enabledRef = useRef(options.enabled);
	const targetLanguageRef = useRef(options.targetLanguage);
	const mountedRef = useRef(true);
	const currentTextRef = useRef<string | null>(null);

	useEffect(() => {
		enabledRef.current = options.enabled;
		targetLanguageRef.current = options.targetLanguage;
	}, [options.enabled, options.targetLanguage]);

	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
			if (currentSpeechTimeout) {
				clearTimeout(currentSpeechTimeout);
				currentSpeechTimeout = null;
			}
			Speech.stop();
		};
	}, []);

	const reloadPreferences = useCallback(async () => {
		let active = true;
		try {
			const [storedRate, storedPitch, storedVolume, storedLanguage] = await Promise.all([
				TTSPreferences.getRate(),
				TTSPreferences.getPitch(),
				TTSPreferences.getVolume(),
				TTSPreferences.getLanguage(),
			]);
			if (active && mountedRef.current) {
				setRate(storedRate);
				setPitch(storedPitch);
				setVolume(storedVolume);
				const lang = storedLanguage || getTTSLanguage(options.targetLanguage);
				setTTSLanguage(lang);
			}
		} catch (error) {
			if (active && mountedRef.current) {
				setError('Failed to load TTS preferences');
			}
		}
	}, [options.targetLanguage]);

	useEffect(() => {
		reloadPreferences();
	}, [reloadPreferences]);

	useEffect(() => {
		const interval = setInterval(() => {
			if (mountedRef.current) {
				reloadPreferences();
			}
		}, 5000);
		return () => clearInterval(interval);
	}, [reloadPreferences]);

	useEffect(() => {
		let active = true;
		const updateLanguage = async () => {
			try {
				const storedLanguage = await TTSPreferences.getLanguage();
				if (active && mountedRef.current) {
					const lang = storedLanguage || getTTSLanguage(options.targetLanguage);
					setTTSLanguage(lang);
				}
			} catch (error) {}
		};
		updateLanguage();
		return () => {
			active = false;
		};
	}, [options.targetLanguage]);

	const stop = useCallback(() => {
		if (currentSpeechTimeout) {
			clearTimeout(currentSpeechTimeout);
			currentSpeechTimeout = null;
		}
		speechQueue = null;
		currentTextRef.current = null;
		Speech.stop();
		if (mountedRef.current) {
			setIsSpeaking(false);
			setIsPaused(false);
		}
	}, []);

	const pause = useCallback(() => {
		if (isSpeaking && !isPaused) {
			Speech.pause();
			if (mountedRef.current) {
				setIsPaused(true);
			}
		}
	}, [isSpeaking, isPaused]);

	const resume = useCallback(() => {
		if (isSpeaking && isPaused) {
			Speech.resume();
			if (mountedRef.current) {
				setIsPaused(false);
			}
		}
	}, [isSpeaking, isPaused]);

	const speak = useCallback(
		async (text: string, language?: string): Promise<void> => {
			if (!enabledRef.current) {
				return;
			}
			const trimmed = text.trim();
			if (!trimmed) {
				return;
			}
			if (trimmed === currentTextRef.current) {
				return;
			}
			stop();
			currentTextRef.current = trimmed;
			speechQueue = trimmed;
			const lang = language || ttsLanguage || getTTSLanguage(targetLanguageRef.current);
			setError(null);
			try {
				await new Promise<void>((resolve, reject) => {
					const onDone = () => {
						if (mountedRef.current) {
							setIsSpeaking(false);
							setIsPaused(false);
						}
						currentTextRef.current = null;
						speechQueue = null;
						resolve();
					};
					const onError = (err: Error) => {
						if (mountedRef.current) {
							setIsSpeaking(false);
							setIsPaused(false);
							setError(err.message || 'Speech synthesis failed');
						}
						currentTextRef.current = null;
						speechQueue = null;
						reject(err);
					};
					if (mountedRef.current) {
						setIsSpeaking(true);
						setIsPaused(false);
					}
					Speech.speak(trimmed, {
						language: lang,
						pitch: pitch,
						rate: rate,
						volume: volume,
						onDone,
						onError,
						onStopped: onDone,
					});
				});
			} catch (err) {
				if (mountedRef.current) {
					setIsSpeaking(false);
					setIsPaused(false);
					setError(err instanceof Error ? err.message : 'Speech synthesis failed');
				}
				currentTextRef.current = null;
				speechQueue = null;
			}
		},
		[rate, pitch, volume, ttsLanguage, stop],
	);

	return {
		speak,
		stop,
		pause,
		resume,
		isSpeaking,
		isPaused,
		error,
		rate,
		pitch,
		volume,
		ttsLanguage,
		reloadPreferences,
	};
};

