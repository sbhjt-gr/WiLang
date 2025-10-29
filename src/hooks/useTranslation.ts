import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TranslationService } from '../services/TranslationService';

export type UseTranslationOptions = {
	enabled: boolean;
	sourceLang: string;
	targetLang: string;
	autoCache?: boolean;
};

export type UseTranslationReturn = {
	translate: (text: string) => Promise<string>;
	translatedText: string | null;
	isTranslating: boolean;
	error: string | null;
	isLanguagePackDownloaded: boolean;
	downloadProgress: number | null;
	downloadLanguagePack: () => Promise<void>;
	setTranslatedText: (value: string | null) => void;
};

const nullify = (value: string | null | undefined) => (value ? value : null);

const normalizeLang = (value: string) => value.trim().toLowerCase();

const makeKey = (text: string, source: string, target: string) => `${source}::${target}::${text}`;

const getSource = (value: string) => {
	const trimmed = normalizeLang(value);
	if (!trimmed) {
		return 'auto';
	}
	return trimmed;
};

export const useTranslation = (options: UseTranslationOptions): UseTranslationReturn => {
	const [translatedText, setTranslatedText] = useState<string | null>(null);
	const [isTranslating, setIsTranslating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isLanguagePackDownloaded, setIsLanguagePackDownloaded] = useState(true);
	const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

	const lastKeyRef = useRef<string | null>(null);
	const mountedRef = useRef(true);

	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
		};
	}, []);

	const sourceLang = useMemo(() => getSource(options.sourceLang), [options.sourceLang]);
	const targetLang = useMemo(() => normalizeLang(options.targetLang), [options.targetLang]);

	const checkPack = useCallback(async () => {
		if (!options.enabled) {
			setIsLanguagePackDownloaded(false);
			return;
		}
		if (!TranslationService.isTranslationAvailable()) {
			setIsLanguagePackDownloaded(false);
			return;
		}
		try {
			const available = await TranslationService.isLanguagePackDownloaded(sourceLang, targetLang);
			if (mountedRef.current) {
				setIsLanguagePackDownloaded(available);
			}
		} catch (err) {
			if (mountedRef.current) {
				setIsLanguagePackDownloaded(false);
			}
		}
	}, [options.enabled, sourceLang, targetLang]);

	useEffect(() => {
		checkPack();
	}, [checkPack]);

	const translate = useCallback(
		async (text: string) => {
			if (!options.enabled) {
				setTranslatedText(null);
				return text;
			}
			const trimmed = text.trim();
			if (!trimmed) {
				setTranslatedText('');
				return '';
			}
			const cacheKey = makeKey(trimmed, sourceLang, targetLang);
			lastKeyRef.current = cacheKey;
			setIsTranslating(true);
			setError(null);
			if (!TranslationService.isTranslationAvailable()) {
				if (lastKeyRef.current === cacheKey) {
					setError('translation_unavailable');
					setTranslatedText(null);
					setIsTranslating(false);
				}
				throw new Error('translation_unavailable');
			}
			const cached = options.autoCache === false ? null : TranslationService.getCachedTranslation(trimmed, sourceLang, targetLang);
			if (cached) {
				if (lastKeyRef.current === cacheKey) {
					setTranslatedText(cached);
					setIsTranslating(false);
				}
				return cached;
			}
			try {
				const result = await TranslationService.translate(trimmed, sourceLang, targetLang);
				if (lastKeyRef.current === cacheKey) {
					if (options.autoCache !== false) {
						TranslationService.cacheTranslation(trimmed, result, sourceLang, targetLang);
					}
					setTranslatedText(result);
				}
				return result;
			} catch (err) {
				const msg = err instanceof Error ? err.message : 'translation_failed';
				if (lastKeyRef.current === cacheKey) {
					setError(msg);
					setTranslatedText(null);
				}
				throw err;
			} finally {
				if (lastKeyRef.current === cacheKey) {
					setIsTranslating(false);
				}
			}
		},
		[options.autoCache, options.enabled, sourceLang, targetLang],
	);

	const downloadLanguagePack = useCallback(async () => {
		if (!options.enabled) {
			return;
		}
		setDownloadProgress(0);
		try {
			await TranslationService.downloadLanguagePack(sourceLang, targetLang);
			if (mountedRef.current) {
				setDownloadProgress(1);
				setIsLanguagePackDownloaded(true);
			}
		} catch (err) {
			if (mountedRef.current) {
				setDownloadProgress(null);
				setIsLanguagePackDownloaded(false);
			}
			throw err;
		} finally {
			if (mountedRef.current) {
				setTimeout(() => {
					setDownloadProgress(null);
				}, 300);
			}
		}
	}, [options.enabled, sourceLang, targetLang]);

	useEffect(() => {
		if (!options.enabled) {
			setTranslatedText(null);
			setError(null);
			setIsTranslating(false);
		}
	}, [options.enabled]);

	return {
		translate,
		translatedText,
		isTranslating,
		error,
		isLanguagePackDownloaded,
		downloadProgress,
		downloadLanguagePack,
		setTranslatedText,
	};
};
