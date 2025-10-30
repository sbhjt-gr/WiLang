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

export type TranslationSettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'TranslationSettingsScreen'>;
export type TranslationSettingsScreenRouteProp = RouteProp<RootStackParamList, 'TranslationSettingsScreen'>;

type Props = {
	navigation: TranslationSettingsScreenNavigationProp;
	route: TranslationSettingsScreenRouteProp;
};

const listForSource = TRANSLATION_LANGUAGE_OPTIONS;
const listForTarget = TRANSLATION_LANGUAGE_OPTIONS.filter(item => item.id !== 'auto');
type PackStatus = 'unknown' | 'available' | 'missing';

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

	useEffect(() => {
		let cancelled = false;
		const init = async () => {
			console.log('translation_settings_init_start');
			try {
				const isAvailable = TranslationService.isTranslationAvailable();
				if (!cancelled) {
					setAvailable(isAvailable);
				}
				const [storedEnabled, storedAuto, storedSource, storedTarget] = await Promise.all([
					TranslationPreferences.isEnabled(),
					TranslationPreferences.isAutoDetect(),
					TranslationPreferences.getSource(),
					TranslationPreferences.getTarget(),
				]);
				if (!cancelled) {
					setEnabled(storedEnabled);
					setAutoDetect(storedAuto);
					setSource(storedSource);
					setTarget(storedTarget);
				}
			} catch (error) {
				console.error('translation_settings_init_error', error);
			} finally {
				if (!cancelled) {
					setLoading(false);
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
	}, [available, autoDetect, source, packStatus, isCheckingPack]);

	useEffect(() => {
		if (loading || isDownloadingPack) {
			return;
		}
		if (!available || autoDetect || source === 'auto') {
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
				return;
			}
			await TranslationService.downloadLanguagePack(source, target);
			console.log('manual_pack_download_success');
			setPackStatus('available');
			setDownloadError(null);
		} catch (error) {
			console.error('manual_pack_download_error', error);
			setPackStatus('missing');
			setDownloadError('Model download failed. Try again later.');
		} finally {
			setIsDownloadingPack(false);
		}
	}, [canDownload, source, target]);

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
	}, [available, autoDetect, source, target, testText, packStatus]);


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
						<View style={styles.section}>
							<Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>
							<Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
								Configure on-device subtitle translation
							</Text>
						</View>

						<View style={[styles.card, { backgroundColor: colors.surface }]}>
							<View style={styles.cardHeader}>
								<View style={[styles.iconContainer, { backgroundColor: `${colors.primary}15` }]}>
									<Ionicons name="language" size={24} color={colors.primary} />
								</View>
								<View style={styles.cardHeaderText}>
									<Text style={[styles.cardTitle, { color: colors.text }]}>Enable Translation</Text>
									<Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
										Real-time subtitle translation
									</Text>
								</View>
								<Switch
									value={enabled}
									onValueChange={setEnabled}
									disabled={!available}
									trackColor={{ false: colors.border, true: colors.primary }}
									thumbColor="#fff"
								/>
							</View>

							{!available && (
								<View style={[styles.warningBanner, { backgroundColor: `${colors.error}10` }]}>
									<Ionicons name="warning" size={16} color={colors.error} />
									<Text style={[styles.warningText, { color: colors.error }]}>
										Translation unavailable on this device. Requires iOS 18+
									</Text>
								</View>
							)}
						</View>

						<View style={[styles.card, { backgroundColor: colors.surface }]}>
							<View style={[styles.settingRow, { opacity: enabled ? 1 : 0.5 }]}>
								<View style={styles.settingLeft}>
									<Ionicons name="scan" size={20} color={colors.text} style={styles.settingIcon} />
									<View>
										<Text style={[styles.settingTitle, { color: colors.text }]}>Auto-detect Source</Text>
										<Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
											Detect language automatically
										</Text>
									</View>
								</View>
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
								<View style={styles.selectorLeft}>
									<Ionicons name="chatbox-ellipses-outline" size={20} color={colors.text} style={styles.settingIcon} />
									<View style={styles.selectorTextContainer}>
										<Text style={[styles.selectorLabel, { color: colors.textSecondary }]}>Source Language</Text>
										<Text style={[styles.selectorValue, { color: colors.text }]}>{sourceText}</Text>
									</View>
								</View>
								<Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
							</TouchableOpacity>

							<View style={[styles.divider, { backgroundColor: colors.border }]} />

							<TouchableOpacity
								style={[styles.languageSelector, { opacity: enabled ? 1 : 0.5 }]}
								disabled={!enabled}
								onPress={() => setShowTarget(true)}
								activeOpacity={0.7}
							>
								<View style={styles.selectorLeft}>
									<Ionicons name="globe-outline" size={20} color={colors.text} style={styles.settingIcon} />
									<View style={styles.selectorTextContainer}>
										<Text style={[styles.selectorLabel, { color: colors.textSecondary }]}>Target Language</Text>
										<Text style={[styles.selectorValue, { color: colors.text }]}>{targetText}</Text>
									</View>
								</View>
								<Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
							</TouchableOpacity>
						</View>

						<View style={[styles.infoCard, { backgroundColor: `${colors.primary}08` }]}>
							<Ionicons name="information-circle" size={20} color={colors.primary} />
							<Text style={[styles.infoText, { color: colors.text }]}>
								Translation is performed on-device for privacy. Some language pairs may require additional downloads.
							</Text>
						</View>

						{available && (
							<View style={styles.section}>
								<Text style={[styles.sectionTitle, { color: colors.text }]}>Test Translation</Text>
								<Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
									Test the translation service with custom text
								</Text>

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
										</>
									)}
								</View>
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
		padding: 24,
	},
	section: {
		marginBottom: 24,
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: '700',
		marginBottom: 8,
	},
	sectionDescription: {
		fontSize: 14,
		marginBottom: 20,
		lineHeight: 20,
	},
	card: {
		borderRadius: 16,
		padding: 20,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	iconContainer: {
		width: 48,
		height: 48,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	cardHeaderText: {
		flex: 1,
	},
	cardTitle: {
		fontSize: 17,
		fontWeight: '600',
		marginBottom: 2,
	},
	cardSubtitle: {
		fontSize: 13,
		opacity: 0.6,
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
		marginBottom: 2,
	},
	settingSubtitle: {
		fontSize: 13,
		opacity: 0.6,
	},
	divider: {
		height: StyleSheet.hairlineWidth,
		marginVertical: 16,
	},
	languageSelector: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 4,
	},
	selectorLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		gap: 12,
	},
	selectorTextContainer: {
		flex: 1,
	},
	selectorLabel: {
		fontSize: 13,
		marginBottom: 4,
		opacity: 0.6,
	},
	selectorValue: {
		fontSize: 16,
		fontWeight: '600',
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
});

export default TranslationSettingsScreen;
