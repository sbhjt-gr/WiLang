import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Switch, Modal, Pressable, StatusBar, TextInput, ActivityIndicator } from 'react-native';
import { Text } from '@rneui/themed';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { TranslationPreferences, type TranslationLang } from '../services/TranslationPreferences';
import { TRANSLATION_LANGUAGE_OPTIONS, getTranslationOptionLabel } from '../constants/translation';
import { TranslationService } from '../services/TranslationService';
import type { RootStackParamList } from '../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import { TTSPreferences } from '../services/TTSPreferences';
import { useTTS } from '../hooks/useTTS';
import { SubtitlePreferences } from '../services/SubtitlePreferences';
import { FEATURES } from '../config/features';
import { AzureTranslationService } from '../services/AzureTranslationService';
import type { AzureStatus } from '../types/azure';

export type TranslationSettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'TranslationSettingsScreen'>;
export type TranslationSettingsScreenRouteProp = RouteProp<RootStackParamList, 'TranslationSettingsScreen'>;

type Props = {
	navigation: TranslationSettingsScreenNavigationProp;
	route: TranslationSettingsScreenRouteProp;
};

const listForSource = TRANSLATION_LANGUAGE_OPTIONS;
const listForTarget = TRANSLATION_LANGUAGE_OPTIONS.filter(item => item.id !== 'auto');
type PackStatus = 'unknown' | 'available' | 'missing';

const labelForLanguage = (code: string) => {
	const match = TRANSLATION_LANGUAGE_OPTIONS.find(item => item.id === code);
	if (match) {
		return match.label;
	}
	return code.toUpperCase();
};

const TranslationSettingsScreen = ({ navigation }: Props) => {
	const { colors } = useTheme();
	const [enabled, setEnabled] = useState(false);
	const [autoDetect, setAutoDetect] = useState(true);
	const [source, setSource] = useState<TranslationLang>('auto');
	const [target, setTarget] = useState<TranslationLang>('en');
	const [showSource, setShowSource] = useState(false);
	const [showTarget, setShowTarget] = useState(false);
	const [available, setAvailable] = useState(false);
	const [loading, setLoading] = useState(true);
	const [testText, setTestText] = useState('Hello, how are you?');
	const [translatedText, setTranslatedText] = useState('');
	const [isTranslating, setIsTranslating] = useState(false);
	const [testError, setTestError] = useState<string | null>(null);
	const [packStatus, setPackStatus] = useState<PackStatus>('unknown');
	const [isCheckingPack, setIsCheckingPack] = useState(false);
	const [isDownloadingPack, setIsDownloadingPack] = useState(false);
	const [downloadError, setDownloadError] = useState<string | null>(null);
	const [downloadedModels, setDownloadedModels] = useState<string[]>([]);
	const [isLoadingModels, setIsLoadingModels] = useState(false);
	const [activeDelete, setActiveDelete] = useState<string | null>(null);
	const [modelError, setModelError] = useState<string | null>(null);
	const [ttsEnabled, setTTSEnabled] = useState(false);
	const [ttsRate, setTTSRate] = useState(1.0);
	const [ttsPitch, setTTSPitch] = useState(1.0);
	const [ttsVolume, setTTSVolume] = useState(1.0);
	const [ttsLoading, setTTSLoading] = useState(true);
	const [testTTSEnabled, setTestTTSEnabled] = useState(false);
	const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
	const [subtitleLoading, setSubtitleLoading] = useState(true);
	
	const [azureEnabled, setAzureEnabled] = useState(false);
	const [azureStatus, setAzureStatus] = useState<AzureStatus>('idle');
	const [azureLiveOriginal, setAzureLiveOriginal] = useState('');
	const [azureLiveTranslated, setAzureLiveTranslated] = useState('');
	const [azureError, setAzureError] = useState<string | null>(null);

	const loadModels = useCallback(async () => {
		setIsLoadingModels(true);
		try {
			if (!TranslationService.isTranslationAvailable()) {
				setDownloadedModels([]);
				setModelError(null);
				return;
			}
			const models = await TranslationService.getDownloadedLanguages();
			models.sort();
			setDownloadedModels(models);
			setModelError(null);
		} catch (error) {
			console.error('models_list_error', error);
			setModelError('Unable to load models.');
		} finally {
			setIsLoadingModels(false);
		}
	}, []);

	useEffect(() => {
		let cancelled = false;
		const init = async () => {
			console.log('translation_settings_init_start');
			try {
				const isAvailable = TranslationService.isTranslationAvailable();
				if (!cancelled) {
					setAvailable(isAvailable);
				}
				const [storedEnabled, storedAuto, storedSource, storedTarget, storedTTSEnabled, storedTTSRate, storedTTSPitch, storedTTSVolume, storedSubtitlesEnabled] = await Promise.all([
					TranslationPreferences.isEnabled(),
					TranslationPreferences.isAutoDetect(),
					TranslationPreferences.getSource(),
					TranslationPreferences.getTarget(),
					TTSPreferences.isEnabled(),
					TTSPreferences.getRate(),
					TTSPreferences.getPitch(),
					TTSPreferences.getVolume(),
					SubtitlePreferences.isEnabled(),
				]);
				if (!cancelled) {
					setEnabled(storedEnabled);
					setAutoDetect(storedAuto);
					setSource(storedSource);
					setTarget(storedTarget);
					setTTSEnabled(storedTTSEnabled);
					setTTSRate(storedTTSRate);
					setTTSPitch(storedTTSPitch);
					setTTSVolume(storedTTSVolume);
					setSubtitlesEnabled(storedSubtitlesEnabled);
				}
			} catch (error) {
				console.error('translation_settings_init_error', error);
			} finally {
				if (!cancelled) {
					setLoading(false);
					setTTSLoading(false);
					setSubtitleLoading(false);
				}
			}
		};
		init();
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (loading) {
			return;
		}
		loadModels();
	}, [loading, loadModels]);

	useEffect(() => {
		if (loading) {
			return;
		}
		console.log('pref_enabled_save', enabled);
		TranslationPreferences.setEnabled(enabled);
	}, [loading, enabled]);

	useEffect(() => {
		if (loading) {
			return;
		}
		console.log('pref_auto_save', autoDetect);
		TranslationPreferences.setAutoDetect(autoDetect);
	}, [loading, autoDetect]);

	useEffect(() => {
		if (loading) {
			return;
		}
		console.log('pref_source_save', source);
		TranslationPreferences.setSource(source);
	}, [loading, source]);

	useEffect(() => {
		if (loading) {
			return;
		}
		console.log('pref_target_save', target);
		TranslationPreferences.setTarget(target);
	}, [loading, target]);

	const ttsHook = useTTS({
		enabled: testTTSEnabled,
		targetLanguage: target,
		autoSpeak: false,
	});

	useEffect(() => {
		if (ttsLoading) {
			return;
		}
		TTSPreferences.setEnabled(ttsEnabled);
	}, [ttsLoading, ttsEnabled]);

	useEffect(() => {
		if (ttsLoading) {
			return;
		}
		TTSPreferences.setRate(ttsRate);
	}, [ttsLoading, ttsRate]);

	useEffect(() => {
		if (ttsLoading) {
			return;
		}
		TTSPreferences.setPitch(ttsPitch);
	}, [ttsLoading, ttsPitch]);

	useEffect(() => {
		if (ttsLoading) {
			return;
		}
		TTSPreferences.setVolume(ttsVolume);
	}, [ttsLoading, ttsVolume]);

	useEffect(() => {
		if (subtitleLoading) {
			return;
		}
		SubtitlePreferences.setEnabled(subtitlesEnabled);
	}, [subtitleLoading, subtitlesEnabled]);

	const handleTestTTS = useCallback(async () => {
		if (!translatedText.trim()) {
			return;
		}
		setTestTTSEnabled(true);
		await new Promise(resolve => setTimeout(resolve, 100));
		try {
			await ttsHook.speak(translatedText.trim());
		} catch (error) {
			console.error('tts_test_error', error);
		} finally {
			setTimeout(() => {
				setTestTTSEnabled(false);
			}, 1000);
		}
	}, [translatedText, ttsHook]);

	useEffect(() => {
		navigation.setOptions({
			headerShown: false,
			gestureEnabled: true,
			gestureDirection: 'horizontal',
		});
	}, [navigation]);

	const sourceText = useMemo(() => getTranslationOptionLabel(source), [source]);
	const targetText = useMemo(() => getTranslationOptionLabel(target), [target]);
	const canTest = useMemo(() => available && !autoDetect && source !== 'auto', [available, autoDetect, source]);
	const canDownload = useMemo(() => available && !autoDetect && source !== 'auto', [available, autoDetect, source]);
	const packStatusLabel = useMemo(() => {
		if (!available) {
			return 'Translation unavailable';
		}
		if (!enabled) {
			return 'Enable translation first';
		}
		if (autoDetect || source === 'auto') {
			return 'Select source language';
		}
		if (isCheckingPack) {
			return 'Checking model';
		}
		if (packStatus === 'available') {
			return 'Model ready';
		}
		if (packStatus === 'missing') {
			return 'Model missing';
		}
		return 'Model status unknown';
	}, [available, enabled, autoDetect, source, packStatus, isCheckingPack]);

	useEffect(() => {
		if (loading || isDownloadingPack) {
			return;
		}
		if (!available || !enabled || autoDetect || source === 'auto') {
			setPackStatus('unknown');
			setIsCheckingPack(false);
			return;
		}
		let cancelled = false;
		setIsCheckingPack(true);
		setPackStatus('unknown');
		const check = async () => {
			console.log('pack_status_check', { source, target });
			try {
				const ready = await TranslationService.isLanguagePackDownloaded(source, target);
				if (!cancelled) {
					setPackStatus(ready ? 'available' : 'missing');
				}
			} catch (error) {
				if (!cancelled) {
					console.error('pack_status_error', error);
					setPackStatus('missing');
				}
			} finally {
				if (!cancelled) {
					setIsCheckingPack(false);
				}
			}
		};
		check();
		return () => {
			cancelled = true;
		};
	}, [loading, available, autoDetect, source, target, isDownloadingPack]);

	const onSelectSource = useCallback((value: TranslationLang) => {
		console.log('source_language_selected', value);
		setSource(value);
		setShowSource(false);
	}, []);

	const onSelectTarget = useCallback((value: TranslationLang) => {
		console.log('target_language_selected', value);
		setTarget(value);
		setShowTarget(false);
	}, []);

	useEffect(() => {
		console.log('translation_config_changed', { autoDetect, source, target });
		setTestError(null);
		setTranslatedText('');
		setDownloadError(null);
		setPackStatus('unknown');
	}, [autoDetect, source, target]);

	const handleDownloadPack = useCallback(async () => {
		console.log('manual_pack_download_start');
		if (!canDownload) {
			setDownloadError('Disable auto-detect and select a source language first.');
			return;
		}
		setDownloadError(null);
		setIsDownloadingPack(true);
		setPackStatus('unknown');
		try {
			let already = false;
			try {
				already = await TranslationService.isLanguagePackDownloaded(source, target);
				console.log('manual_pack_check', already);
			} catch (checkError) {
				console.error('manual_pack_check_error', checkError);
			}
			if (already) {
				setPackStatus('available');
				setDownloadError(null);
				await loadModels();
				return;
			}
			await TranslationService.downloadLanguagePack(source, target);
			console.log('manual_pack_download_success');
			setPackStatus('available');
			setDownloadError(null);
			await loadModels();
		} catch (error) {
			console.error('manual_pack_download_error', error);
			setPackStatus('missing');
			setDownloadError('Model download failed. Try again later.');
		} finally {
			setIsDownloadingPack(false);
		}
	}, [canDownload, source, target, loadModels]);

	const handleTestTranslation = useCallback(async () => {
		console.log('test_start');
		console.log('test_available', available);
		console.log('test_auto', autoDetect);
		console.log('test_source', source);
		console.log('test_target', target);
		console.log('test_input', testText);
		const trimmed = testText.trim();
		const ready = available && !autoDetect && source !== 'auto';
		console.log('test_trimmed', trimmed);
		console.log('test_ready', ready);
		if (!ready) {
			console.log('test_ready_fail');
			setTestError('Disable auto-detect and select a source language to test translation.');
			setTranslatedText('');
			return;
		}
		if (!trimmed) {
			console.log('test_empty');
			setTestError('Enter text to translate.');
			setTranslatedText('');
			return;
		}
		setIsTranslating(true);
		setTranslatedText('');
		setTestError(null);
		setDownloadError(null);
		const effectiveSource = source;
		console.log('test_service', TranslationService.isTranslationAvailable());
		try {
			let readyPack = packStatus === 'available';
			console.log('test_pack_state', packStatus);
			if (!readyPack) {
				console.log('test_pack_check_start', { effectiveSource, target });
				try {
					readyPack = await TranslationService.isLanguagePackDownloaded(effectiveSource, target);
					console.log('test_pack_check_result', readyPack);
					setPackStatus(readyPack ? 'available' : 'missing');
				} catch (checkError) {
					console.error('test_pack_check_error', checkError);
					readyPack = false;
					setPackStatus('missing');
				}
			}
			if (!readyPack) {
				console.log('test_pack_download_start', { effectiveSource, target });
				setIsDownloadingPack(true);
				try {
					await TranslationService.downloadLanguagePack(effectiveSource, target);
					console.log('test_pack_download_success');
					readyPack = true;
					setPackStatus('available');
					await loadModels();
				} catch (downloadErr) {
					console.error('test_pack_download_error', downloadErr);
					setDownloadError('Model download unavailable for this language pair.');
					setTestError('Model download failed. Try another language pair or retry later.');
					setPackStatus('missing');
					return;
				} finally {
					setIsDownloadingPack(false);
				}
			}
			if (!readyPack) {
				setTestError('Model download failed. Try another language pair or retry later.');
				return;
			}
			console.log('test_translate_call', { trimmed, effectiveSource, target });
			const result = await TranslationService.translate(trimmed, effectiveSource, target);
			console.log('test_translate_success', result);
			setTranslatedText(result);
			console.log('test_success');
			await loadModels();
		} catch (error) {
			console.error('translation_test_error', error);
			console.log('translation_error_details', {
				error,
				type: typeof error,
				message: error instanceof Error ? error.message : 'unknown',
				stack: error instanceof Error ? error.stack : undefined,
				keys: error ? Object.keys(error) : [],
				stringified: JSON.stringify(error, null, 2)
			});
			const message = error instanceof Error ? error.message : 'Translation failed';
			setTestError(message || 'Translation failed');
			setTranslatedText('');
			console.log('test_fail');
		} finally {
			setIsTranslating(false);
		}
	}, [available, autoDetect, source, target, testText, packStatus, loadModels]);

	const handleDeleteModel = useCallback(async (code: string) => {
		console.log('model_delete_start', code);
		setActiveDelete(code);
		setModelError(null);
		try {
			await TranslationService.deleteLanguage(code);
			await loadModels();
		} catch (error) {
			console.error('model_delete_error', error);
			setModelError('Failed to delete model.');
		} finally {
			setActiveDelete(null);
		}
	}, [loadModels]);

	const handleAzureRealtimeTest = useCallback(async () => {
		if (!AzureTranslationService.isAvailable()) {
			setAzureError('Azure not configured');
			return;
		}
		if (source === 'auto' || target === 'auto') {
			setAzureError('Select source and target language');
			return;
		}
		setAzureStatus('connecting');
		setAzureError(null);
		setAzureLiveOriginal('');
		setAzureLiveTranslated('');

		try {
			await AzureTranslationService.translateRealtime(
				testText,
				source,
				target,
				(orig, trans) => {
					setAzureLiveOriginal(orig);
					setAzureLiveTranslated(trans);
					setAzureStatus('translating');
				}
			);
			setAzureStatus('idle');
		} catch (error) {
			setAzureError(error instanceof Error ? error.message : 'Azure translation failed');
			setAzureStatus('error');
		}
	}, [source, target, testText]);

	return (
		<>
			<StatusBar barStyle="light-content" backgroundColor="#8b5cf6" />
			<SafeAreaView style={styles.safeArea} edges={['top']}>
				<View style={[styles.container, { backgroundColor: colors.background }]}>
					<View style={[styles.header, { backgroundColor: '#8b5cf6' }]}>
						<TouchableOpacity
							style={styles.backButton}
							onPress={() => navigation.goBack()}
						>
							<Ionicons name="arrow-back" size={24} color="#ffffff" />
						</TouchableOpacity>
						<Text style={styles.headerTitle}>Translation</Text>
						<View style={styles.headerRight} />
					</View>

					<ScrollView
						style={styles.scrollView}
						contentContainerStyle={styles.scrollContent}
						showsVerticalScrollIndicator={false}
					>
					<View style={[styles.card, { backgroundColor: colors.surface }]}>
						<View style={styles.settingRow}>
							<View style={styles.settingLeft}>
								<Text style={[styles.settingTitle, { color: colors.text }]}>Subtitles</Text>
							</View>
							<Switch
								value={subtitlesEnabled}
								onValueChange={setSubtitlesEnabled}
								trackColor={{ false: colors.border, true: colors.primary }}
								thumbColor="#fff"
							/>
						</View>

						<View style={[styles.divider, { backgroundColor: colors.border }]} />

						<View style={styles.settingRow}>
							<View style={styles.settingLeft}>
								<Text style={[styles.settingTitle, { color: colors.text }]}>Translation</Text>
								{!available && (
									<Text style={[styles.settingSubtitle, { color: colors.error, fontSize: 11 }]}>
										Requires iOS 18+
									</Text>
								)}
							</View>
							<Switch
								value={enabled}
								onValueChange={setEnabled}
								disabled={!available}
								trackColor={{ false: colors.border, true: colors.primary }}
								thumbColor="#fff"
							/>
						</View>
					</View>

					{enabled && (
						<View style={[styles.card, { backgroundColor: colors.surface }]}>
							<View style={[styles.settingRow, { opacity: enabled ? 1 : 0.5 }]}>
								<Text style={[styles.settingTitle, { color: colors.text }]}>Auto-detect Source</Text>
								<Switch
									value={autoDetect}
									onValueChange={setAutoDetect}
									disabled={!enabled}
									trackColor={{ false: colors.border, true: colors.primary }}
									thumbColor="#fff"
								/>
							</View>

							<View style={[styles.divider, { backgroundColor: colors.border }]} />

							<TouchableOpacity
								style={[styles.languageSelector, { opacity: enabled && !autoDetect ? 1 : 0.5 }]}
								disabled={!enabled || autoDetect}
								onPress={() => setShowSource(true)}
								activeOpacity={0.7}
							>
								<Text style={[styles.selectorLabel, { color: colors.textSecondary }]}>From: {sourceText}</Text>
								<Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
							</TouchableOpacity>

							<View style={[styles.divider, { backgroundColor: colors.border }]} />

							<TouchableOpacity
								style={[styles.languageSelector, { opacity: enabled ? 1 : 0.5 }]}
								disabled={!enabled}
								onPress={() => setShowTarget(true)}
								activeOpacity={0.7}
							>
								<Text style={[styles.selectorLabel, { color: colors.textSecondary }]}>To: {targetText}</Text>
								<Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
							</TouchableOpacity>
						</View>
					)}

					{enabled && !autoDetect && source !== 'auto' && (
						<View style={[styles.card, { backgroundColor: colors.surface }]}>
							<View style={styles.packRow}>
								{isCheckingPack ? (
									<ActivityIndicator size="small" color={colors.primary} />
								) : (
									<Ionicons
										name={packStatus === 'available' ? 'checkmark-circle' : 'cloud-download-outline'}
										size={18}
										color={packStatus === 'available' ? colors.primary : colors.textSecondary}
									/>
								)}
								<Text style={[styles.packStatusText, { color: colors.text }]}>{packStatusLabel}</Text>
								{canDownload && packStatus !== 'available' && (
									<TouchableOpacity
										style={[styles.packActionButton, { borderColor: colors.primary }]}
										onPress={handleDownloadPack}
										disabled={isDownloadingPack || isCheckingPack}
										activeOpacity={0.7}
									>
										{isDownloadingPack ? (
											<ActivityIndicator size="small" color={colors.primary} />
										) : (
											<Text style={[styles.packActionButtonText, { color: colors.primary }]}>Download</Text>
										)}
									</TouchableOpacity>
								)}
							</View>
							{downloadError && (
								<Text style={[styles.packError, { color: colors.error, marginTop: 8 }]}>{downloadError}</Text>
							)}
						</View>
					)}

					<View style={[styles.card, { backgroundColor: colors.surface }]}>
						<View style={styles.settingRow}>
							<Text style={[styles.settingTitle, { color: colors.text }]}>Text-to-Speech</Text>
							<Switch
								value={ttsEnabled}
								onValueChange={setTTSEnabled}
								trackColor={{ false: colors.border, true: colors.primary }}
								thumbColor="#fff"
							/>
						</View>

						{ttsEnabled && (
							<>
								<View style={[styles.divider, { backgroundColor: colors.border }]} />
								<View style={styles.ttsSliderContainer}>
									<View style={styles.ttsSliderHeader}>
										<Text style={[styles.ttsSliderLabel, { color: colors.text }]}>Rate: {ttsRate.toFixed(1)}x</Text>
									</View>
									<View style={styles.sliderContainer}>
										<TouchableOpacity
											style={styles.sliderTrack}
											onPress={(e) => {
												const { locationX } = e.nativeEvent;
												const width = e.currentTarget?.clientWidth || 280;
												const ratio = Math.max(0, Math.min(1, locationX / width));
												const value = 0.1 + ratio * 1.9;
												setTTSRate(value);
											}}
											activeOpacity={1}
										>
											<View style={[styles.sliderProgress, { width: `${((ttsRate - 0.1) / 1.9) * 100}%`, backgroundColor: colors.primary }]} />
											<View style={[styles.sliderThumb, { left: `${((ttsRate - 0.1) / 1.9) * 100}%`, backgroundColor: colors.primary }]} />
										</TouchableOpacity>
									</View>
								</View>

								<View style={styles.ttsSliderContainer}>
									<View style={styles.ttsSliderHeader}>
										<Text style={[styles.ttsSliderLabel, { color: colors.text }]}>Pitch: {ttsPitch.toFixed(1)}</Text>
									</View>
									<View style={styles.sliderContainer}>
										<TouchableOpacity
											style={styles.sliderTrack}
											onPress={(e) => {
												const { locationX } = e.nativeEvent;
												const width = e.currentTarget?.clientWidth || 280;
												const ratio = Math.max(0, Math.min(1, locationX / width));
												const value = ratio * 2.0;
												setTTSPitch(value);
											}}
											activeOpacity={1}
										>
											<View style={[styles.sliderProgress, { width: `${(ttsPitch / 2.0) * 100}%`, backgroundColor: colors.primary }]} />
											<View style={[styles.sliderThumb, { left: `${(ttsPitch / 2.0) * 100}%`, backgroundColor: colors.primary }]} />
										</TouchableOpacity>
									</View>
								</View>

								<View style={styles.ttsSliderContainer}>
									<View style={styles.ttsSliderHeader}>
										<Text style={[styles.ttsSliderLabel, { color: colors.text }]}>Volume: {Math.round(ttsVolume * 100)}%</Text>
									</View>
									<View style={styles.sliderContainer}>
										<TouchableOpacity
											style={styles.sliderTrack}
											onPress={(e) => {
												const { locationX } = e.nativeEvent;
												const width = e.currentTarget?.clientWidth || 280;
												const ratio = Math.max(0, Math.min(1, locationX / width));
												setTTSVolume(ratio);
											}}
											activeOpacity={1}
										>
											<View style={[styles.sliderProgress, { width: `${ttsVolume * 100}%`, backgroundColor: colors.primary }]} />
											<View style={[styles.sliderThumb, { left: `${ttsVolume * 100}%`, backgroundColor: colors.primary }]} />
										</TouchableOpacity>
									</View>
								</View>
							</>
						)}
					</View>

					{available && (
						<View style={[styles.card, { backgroundColor: colors.surface }]}>
									{isLoadingModels ? (
										<View style={styles.modelsLoadingRow}>
											<ActivityIndicator size="small" color={colors.primary} />
											<Text style={[styles.modelsLoadingText, { color: colors.textSecondary }]}>Loading models...</Text>
										</View>
									) : downloadedModels.length === 0 ? (
										<Text style={[styles.modelEmptyText, { color: colors.textSecondary }]}>No models downloaded.</Text>
									) : (
										<View style={styles.modelsList}>
											{downloadedModels.map(item => (
												<View key={item} style={[styles.modelRow, { borderColor: colors.border }]}>
													<View style={styles.modelInfo}>
														<Text style={[styles.modelName, { color: colors.text }]}>{labelForLanguage(item)}</Text>
														<Text style={[styles.modelCode, { color: colors.textSecondary }]}>{item}</Text>
													</View>
													<TouchableOpacity
														style={[styles.modelDeleteButton, { borderColor: colors.error }]}
														onPress={() => handleDeleteModel(item)}
														disabled={activeDelete === item}
													>
														{activeDelete === item ? (
															<ActivityIndicator size="small" color={colors.error} />
														) : (
															<Text style={[styles.modelDeleteText, { color: colors.error }]}>Delete</Text>
														)}
													</TouchableOpacity>
												</View>
											))}
										</View>
									)}
									{modelError && (
										<Text style={[styles.modelError, { color: colors.error }]}>{modelError}</Text>
									)}
						</View>
					)}

					{available && (
						<View style={[styles.card, { backgroundColor: colors.surface }]}>
									<Text style={[styles.testLabel, { color: colors.text }]}>Input Text</Text>
									<TextInput
										style={[styles.testInput, { 
											backgroundColor: colors.background, 
											color: colors.text,
											borderColor: colors.border 
										}]}
										value={testText}
										onChangeText={setTestText}
										placeholder="Enter text to translate"
										placeholderTextColor={colors.textSecondary}
										multiline
										editable={canTest && !isTranslating}
									/>

									<View style={[styles.packRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
										{isCheckingPack ? (
											<ActivityIndicator size="small" color={colors.primary} style={styles.packSpinner} />
										) : (
											<Ionicons
												name={packStatus === 'available' ? 'checkmark-circle' : 'cloud-download-outline'}
												size={18}
												color={packStatus === 'available' ? colors.primary : colors.textSecondary}
											/>
										)}
										<Text style={[styles.packStatusText, { color: colors.text }]}>{packStatusLabel}</Text>
										{canDownload && packStatus !== 'available' && (
											<TouchableOpacity
												style={[styles.packActionButton, { borderColor: colors.primary }]}
												onPress={handleDownloadPack}
												disabled={isDownloadingPack || isCheckingPack}
												activeOpacity={0.7}
											>
												{isDownloadingPack ? (
													<ActivityIndicator size="small" color={colors.primary} />
												) : (
													<Text style={[styles.packActionButtonText, { color: colors.primary }]}>Download</Text>
												)}
											</TouchableOpacity>
										)}
									</View>

									{downloadError && (
										<Text style={[styles.packError, { color: colors.error }]}>{downloadError}</Text>
									)}

									{!canTest && (
										<Text style={[styles.testHint, { color: colors.error }]}>Disable auto-detect and pick a source language to run translation tests.</Text>
									)}

									<TouchableOpacity
										style={[
											styles.testButton,
											{ backgroundColor: colors.primary },
											(isTranslating || !canTest) && styles.testButtonDisabled
										]}
										onPress={handleTestTranslation}
										disabled={isTranslating || !testText.trim() || !canTest}
										activeOpacity={0.7}
									>
										{isTranslating ? (
											<>
												<ActivityIndicator size="small" color="#fff" />
												<Text style={styles.testButtonText}>Translating...</Text>
											</>
										) : (
											<>
												<Ionicons name="language" size={20} color="#fff" />
												<Text style={styles.testButtonText}>Translate</Text>
											</>
										)}
									</TouchableOpacity>

									{testError && (
										<Text style={[styles.testError, { color: colors.error }]}>{testError}</Text>
									)}

									{translatedText !== '' && (
										<>
											<View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 16 }]} />
											<Text style={[styles.testLabel, { color: colors.text }]}>Translation Result</Text>
											<View style={[styles.resultBox, { 
												backgroundColor: colors.background,
												borderColor: colors.border 
											}]}>
												<Text style={[styles.resultText, { color: colors.text }]}>
													{translatedText}
												</Text>
											</View>
											<TouchableOpacity
												style={[
													styles.testTTSButton,
													{ backgroundColor: colors.primary },
													(ttsHook.isSpeaking || !ttsEnabled) && styles.testButtonDisabled
												]}
												onPress={handleTestTTS}
												disabled={ttsHook.isSpeaking || !ttsEnabled}
												activeOpacity={0.7}
											>
												{ttsHook.isSpeaking ? (
													<>
														<ActivityIndicator size="small" color="#fff" />
														<Text style={styles.testButtonText}>Speaking...</Text>
													</>
												) : (
													<>
														<Ionicons name="volume-high" size={20} color="#fff" />
														<Text style={styles.testButtonText}>Test TTS</Text>
													</>
												)}
											</TouchableOpacity>
										</>
									)}
								</View>
						)}

						{FEATURES.AZURE_TRANSLATION && (
							<View style={[styles.card, { backgroundColor: colors.surface }]}>
								<View style={styles.settingRow}>
									<Text style={[styles.settingTitle, { color: colors.text }]}>Azure Real-Time Translation (Beta)</Text>
									<Switch
										value={azureEnabled}
										onValueChange={setAzureEnabled}
										trackColor={{ false: '#ccc', true: colors.primary }}
										thumbColor={azureEnabled ? '#fff' : '#f4f3f4'}
									/>
								</View>

								{azureEnabled && (
									<>
										<Text style={[styles.settingSubtitle, { color: colors.textSecondary, marginTop: 8 }]}>
											Simulated streaming translation (Dev only - Not real Azure)
										</Text>

										{azureError && (
											<Text style={[styles.testError, { color: colors.error }]}>{azureError}</Text>
										)}

										{azureStatus === 'idle' && (
											<TouchableOpacity
												style={[styles.testButton, { backgroundColor: colors.primary }]}
												onPress={handleAzureRealtimeTest}
												disabled={!testText.trim() || source === 'auto' || target === 'auto'}
												activeOpacity={0.7}
											>
												<Ionicons name="flash" size={20} color="#fff" />
												<Text style={styles.testButtonText}>Start Real-Time Test</Text>
											</TouchableOpacity>
										)}

										{azureStatus === 'connecting' && (
											<View style={styles.azureStatusContainer}>
												<ActivityIndicator size="small" color={colors.primary} />
												<Text style={[styles.azureStatusText, { color: colors.textSecondary }]}>
													Connecting to Azure...
												</Text>
											</View>
										)}

										{(azureStatus === 'translating' || azureLiveOriginal || azureLiveTranslated) && (
											<>
												<View style={[styles.azureLiveBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
													<Text style={[styles.azureLiveLabel, { color: colors.textSecondary }]}>Original</Text>
													<Text style={[styles.azureLiveText, { color: colors.text }]}>
														{azureLiveOriginal || '...'}
													</Text>
												</View>
												<View style={[styles.azureLiveBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
													<Text style={[styles.azureLiveLabel, { color: colors.textSecondary }]}>Translated</Text>
													<Text style={[styles.azureLiveText, { color: colors.text }]}>
														{azureLiveTranslated || '...'}
													</Text>
												</View>
												{azureStatus === 'translating' && (
													<View style={styles.azureStatusContainer}>
														<ActivityIndicator size="small" color={colors.primary} />
														<Text style={[styles.azureStatusText, { color: colors.textSecondary }]}>
															Translating...
														</Text>
													</View>
												)}
											</>
										)}
									</>
								)}
							</View>
						)}
					</ScrollView>
				</View>
			</SafeAreaView>

			<Modal 
				transparent 
				visible={showSource} 
				animationType="fade"
				onRequestClose={() => setShowSource(false)}
			>
				<Pressable 
					style={styles.modalOverlay} 
					onPress={() => setShowSource(false)}
				>
					<View style={styles.modalContainer}>
						<View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
							<View style={styles.modalHeader}>
								<Text style={[styles.modalTitle, { color: colors.text }]}>Source Language</Text>
								<TouchableOpacity 
									onPress={() => setShowSource(false)}
									style={styles.closeButton}
								>
									<Ionicons name="close" size={24} color={colors.text} />
								</TouchableOpacity>
							</View>
							<ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
								{listForSource.map((item, index) => (
									<TouchableOpacity 
										key={item.id} 
										style={[
											styles.modalItem,
											index !== listForSource.length - 1 && styles.modalItemBorder,
											{ borderColor: colors.border }
										]} 
										onPress={() => onSelectSource(item.id as TranslationLang)}
										activeOpacity={0.7}
									>
										<Text style={[
											styles.modalItemText, 
											{ color: colors.text },
											source === item.id && { color: colors.primary, fontWeight: '600' }
										]}>
											{item.label}
										</Text>
										{source === item.id && (
											<Ionicons name="checkmark" size={20} color={colors.primary} />
										)}
									</TouchableOpacity>
								))}
							</ScrollView>
						</View>
					</View>
				</Pressable>
			</Modal>

			<Modal 
				transparent 
				visible={showTarget} 
				animationType="fade"
				onRequestClose={() => setShowTarget(false)}
			>
				<Pressable 
					style={styles.modalOverlay} 
					onPress={() => setShowTarget(false)}
				>
					<View style={styles.modalContainer}>
						<View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
							<View style={styles.modalHeader}>
								<Text style={[styles.modalTitle, { color: colors.text }]}>Target Language</Text>
								<TouchableOpacity 
									onPress={() => setShowTarget(false)}
									style={styles.closeButton}
								>
									<Ionicons name="close" size={24} color={colors.text} />
								</TouchableOpacity>
							</View>
							<ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
								{listForTarget.map((item, index) => (
									<TouchableOpacity 
										key={item.id} 
										style={[
											styles.modalItem,
											index !== listForTarget.length - 1 && styles.modalItemBorder,
											{ borderColor: colors.border }
										]} 
										onPress={() => onSelectTarget(item.id as TranslationLang)}
										activeOpacity={0.7}
									>
										<Text style={[
											styles.modalItemText, 
											{ color: colors.text },
											target === item.id && { color: colors.primary, fontWeight: '600' }
										]}>
											{item.label}
										</Text>
										{target === item.id && (
											<Ionicons name="checkmark" size={20} color={colors.primary} />
										)}
					</TouchableOpacity>
				))}
			</ScrollView>
						</View>
					</View>
				</Pressable>
			</Modal>
			<Modal
				transparent
				visible={isDownloadingPack}
				animationType="fade"
				onRequestClose={() => {}}
			>
				<View style={styles.progressOverlay}>
					<View style={[styles.progressContent, { backgroundColor: colors.surface }]}>
						<ActivityIndicator size="large" color={colors.primary} />
						<Text style={[styles.progressText, { color: colors.text }]}>Downloading model...</Text>
					</View>
				</View>
			</Modal>

		</>
	);
};


const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#8b5cf6',
	},
	container: {
		flex: 1,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 20,
		paddingVertical: 16,
		borderBottomLeftRadius: 24,
		borderBottomRightRadius: 24,
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 4,
	},
	backButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: 'rgba(255,255,255,0.1)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: '#ffffff',
	},
	headerRight: {
		width: 40,
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		padding: 20,
	},
	card: {
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	warningBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginTop: 16,
		padding: 12,
		borderRadius: 8,
	},
	warningText: {
		flex: 1,
		fontSize: 12,
		lineHeight: 16,
	},
	settingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	settingLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		gap: 12,
	},
	settingIcon: {
		width: 24,
	},
	settingTitle: {
		fontSize: 16,
		fontWeight: '600',
	},
	settingSubtitle: {
		fontSize: 12,
		marginTop: 2,
		opacity: 0.7,
	},
	divider: {
		height: StyleSheet.hairlineWidth,
		marginVertical: 12,
	},
	languageSelector: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 8,
	},
	selectorLabel: {
		fontSize: 15,
		flex: 1,
	},
	infoCard: {
		flexDirection: 'row',
		padding: 16,
		borderRadius: 12,
		gap: 12,
		alignItems: 'flex-start',
	},
	infoText: {
		flex: 1,
		fontSize: 13,
		lineHeight: 18,
		opacity: 0.8,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.5)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalContainer: {
		width: '85%',
		maxHeight: '70%',
	},
	modalContent: {
		borderRadius: 20,
		overflow: 'hidden',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.3,
		shadowRadius: 20,
		elevation: 10,
	},
	modalHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: 20,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: 'rgba(0,0,0,0.1)',
	},
	modalTitle: {
		fontSize: 20,
		fontWeight: '700',
	},
	closeButton: {
		width: 32,
		height: 32,
		alignItems: 'center',
		justifyContent: 'center',
	},
	modalList: {
		maxHeight: 400,
	},
	modalItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 16,
		paddingHorizontal: 20,
	},
	modalItemBorder: {
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	modalItemText: {
		fontSize: 16,
	},
	testLabel: {
		fontSize: 14,
		fontWeight: '600',
		marginBottom: 8,
	},
	testInput: {
		borderWidth: 1,
		borderRadius: 12,
		padding: 12,
		fontSize: 15,
		minHeight: 100,
		textAlignVertical: 'top',
		marginBottom: 16,
	},
	testButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 16,
		borderRadius: 12,
		gap: 8,
	},
	testButtonDisabled: {
		opacity: 0.6,
	},
	testButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	},
	testHint: {
		fontSize: 12,
		marginBottom: 12,
	},
	testError: {
		marginTop: 12,
		fontSize: 13,
	},
	packRow: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderRadius: 12,
		paddingVertical: 10,
		paddingHorizontal: 12,
		marginBottom: 12,
		gap: 10,
	},
	packSpinner: {
		marginRight: 6,
	},
	packStatusText: {
		flex: 1,
		fontSize: 13,
	},
	packActionButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 12,
		borderWidth: 1,
	},
	packActionButtonText: {
		fontSize: 13,
		fontWeight: '600',
	},
	packError: {
		marginTop: 8,
		fontSize: 12,
	},
	resultBox: {
		borderWidth: 1,
		borderRadius: 12,
		padding: 12,
		minHeight: 80,
	},
	resultText: {
		fontSize: 15,
		lineHeight: 22,
	},
	modelsList: {
		gap: 12,
	},
	modelRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderWidth: 1,
		borderRadius: 12,
		paddingVertical: 12,
		paddingHorizontal: 16,
	},
	modelInfo: {
		flex: 1,
		marginRight: 12,
	},
	modelName: {
		fontSize: 15,
		fontWeight: '600',
	},
	modelCode: {
		fontSize: 12,
	},
	modelDeleteButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderWidth: 1,
		borderRadius: 12,
	},
	modelDeleteText: {
		fontSize: 13,
		fontWeight: '600',
	},
	modelEmptyText: {
		fontSize: 13,
		textAlign: 'center',
	},
	modelsLoadingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	modelsLoadingText: {
		fontSize: 13,
	},
	modelError: {
		marginTop: 12,
		fontSize: 13,
		textAlign: 'center',
	},
	progressOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.4)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	progressContent: {
		width: '70%',
		borderRadius: 16,
		padding: 24,
		alignItems: 'center',
		gap: 16,
	},
	progressText: {
		fontSize: 14,
		textAlign: 'center',
	},
	ttsSliderContainer: {
		marginTop: 12,
		gap: 6,
	},
	ttsSliderHeader: {
		marginBottom: 4,
	},
	ttsSliderLabel: {
		fontSize: 14,
		fontWeight: '500',
	},
	sliderContainer: {
		height: 36,
		justifyContent: 'center',
	},
	sliderTrack: {
		height: 4,
		backgroundColor: 'rgba(0,0,0,0.1)',
		borderRadius: 2,
		position: 'relative',
	},
	sliderProgress: {
		height: 4,
		borderRadius: 2,
		position: 'absolute',
		top: 0,
		left: 0,
	},
	sliderThumb: {
		width: 20,
		height: 20,
		borderRadius: 10,
		position: 'absolute',
		top: -8,
		marginLeft: -10,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
		elevation: 4,
	},
	testTTSButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 16,
		borderRadius: 12,
		gap: 8,
		marginTop: 12,
	},
	azureStatusContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 12,
		gap: 8,
	},
	azureStatusText: {
		fontSize: 14,
	},
	azureLiveBox: {
		padding: 12,
		borderRadius: 8,
		borderWidth: 1,
		marginTop: 12,
	},
	azureLiveLabel: {
		fontSize: 12,
		fontWeight: '600',
		marginBottom: 6,
	},
	azureLiveText: {
		fontSize: 14,
		minHeight: 40,
	},
});

export default TranslationSettingsScreen;
