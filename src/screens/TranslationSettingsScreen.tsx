import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Switch, Modal, Pressable } from 'react-native';
import { Text } from '@rneui/themed';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
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

	useEffect(() => {
		let mounted = true;
		const load = async () => {
			try {
				const [isEnabled, isAuto, src, tgt] = await Promise.all([
					TranslationPreferences.isEnabled(),
					TranslationPreferences.isAutoDetect(),
					TranslationPreferences.getSource(),
					TranslationPreferences.getTarget(),
				]);
				if (mounted) {
					setEnabled(isEnabled);
					setAutoDetect(isAuto);
					setSource(src);
					setTarget(tgt);
				}
			} finally {
				if (mounted) {
					setLoading(false);
				}
			}
		};
		load();
		return () => {
			mounted = false;
		};
	}, []);

	useEffect(() => {
		setAvailable(TranslationService.isTranslationAvailable());
	}, []);

	useEffect(() => {
		if (loading) {
			return;
		}
		TranslationPreferences.setEnabled(enabled);
	}, [enabled, loading]);

	useEffect(() => {
		if (loading) {
			return;
		}
		TranslationPreferences.setAutoDetect(autoDetect);
	}, [autoDetect, loading]);

	useEffect(() => {
		if (loading) {
			return;
		}
		TranslationPreferences.setSource(source);
	}, [loading, source]);

	useEffect(() => {
		if (loading) {
			return;
		}
		TranslationPreferences.setTarget(target);
	}, [loading, target]);

	useEffect(() => {
		navigation.setOptions({
			headerShown: true,
			headerStyle: {
				backgroundColor: colors.primary,
			},
			headerTintColor: '#fff',
			headerTitle: 'Translation',
			headerTitleStyle: {
				fontWeight: '700',
			},
			headerShadowVisible: false,
			gestureEnabled: true,
			gestureDirection: 'horizontal',
		});
	}, [navigation, colors.primary]);

	const sourceText = useMemo(() => getTranslationOptionLabel(source), [source]);
	const targetText = useMemo(() => getTranslationOptionLabel(target), [target]);

	const onSelectSource = useCallback((value: TranslationLang) => {
		setSource(value);
		setShowSource(false);
	}, []);

	const onSelectTarget = useCallback((value: TranslationLang) => {
		setTarget(value);
		setShowTarget(false);
	}, []);

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<ScrollView 
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.header}>
					<Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
					<Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
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
			</ScrollView>

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
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		padding: 20,
	},
	header: {
		marginBottom: 20,
	},
	headerTitle: {
		fontSize: 24,
		fontWeight: '700',
		marginBottom: 4,
	},
	headerSubtitle: {
		fontSize: 15,
		opacity: 0.7,
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
});

export default TranslationSettingsScreen;
