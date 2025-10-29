import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Switch, Modal } from 'react-native';
import { Text } from '@rneui/themed';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useTheme } from '../theme';
import { TranslationPreferences, type TranslationLang } from '../services/TranslationPreferences';
import { TRANSLATION_LANGUAGE_OPTIONS, getTranslationOptionLabel } from '../constants/translation';
import { TranslationService } from '../services/TranslationService';
import type { RootStackParamList } from '../types/navigation';

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
		navigation.setOptions({ title: 'Translation' });
	}, [navigation]);

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
			<ScrollView contentContainerStyle={styles.content}>
				<View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
					<View style={styles.row}>
						<View style={styles.rowText}>
							<Text style={[styles.title, { color: colors.text }]}>Enable translation</Text>
							<Text style={[styles.subtitle, { color: colors.textSecondary }]}>Translate subtitles on device</Text>
						</View>
						<Switch value={enabled} onValueChange={setEnabled} disabled={!available} />
					</View>
					{!available ? (
						<Text style={[styles.info, { color: colors.textSecondary }]}>Translation module unavailable on this device.</Text>
					) : null}
				</View>

				<View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
					<View style={styles.row}>
						<View style={styles.rowText}>
							<Text style={[styles.title, { color: colors.text }]}>Auto detect source</Text>
							<Text style={[styles.subtitle, { color: colors.textSecondary }]}>Switch source language automatically</Text>
						</View>
						<Switch value={autoDetect} onValueChange={setAutoDetect} disabled={!enabled} />
					</View>

					<TouchableOpacity
						style={styles.selector}
						disabled={!enabled || autoDetect}
						onPress={() => setShowSource(true)}
					>
						<Text style={[styles.selectorLabel, { color: colors.textSecondary }]}>Source language</Text>
						<Text style={[styles.selectorValue, { color: colors.text }]}>{sourceText}</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.selector}
						disabled={!enabled}
						onPress={() => setShowTarget(true)}
					>
						<Text style={[styles.selectorLabel, { color: colors.textSecondary }]}>Target language</Text>
						<Text style={[styles.selectorValue, { color: colors.text }]}>{targetText}</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>

			<Modal transparent visible={showSource} animationType="fade">
				<View style={styles.modalWrap}>
					<TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSource(false)} />
					<View style={[styles.modalBody, { backgroundColor: colors.surface }]}> 
						<Text style={[styles.modalTitle, { color: colors.text }]}>Select source</Text>
						{listForSource.map(item => (
							<TouchableOpacity key={item.id} style={styles.modalItem} onPress={() => onSelectSource(item.id as TranslationLang)}>
								<Text style={[styles.modalItemText, { color: colors.text }]}>{item.label}</Text>
							</TouchableOpacity>
						))}
					</View>
				</View>
			</Modal>

			<Modal transparent visible={showTarget} animationType="fade">
				<View style={styles.modalWrap}>
					<TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTarget(false)} />
					<View style={[styles.modalBody, { backgroundColor: colors.surface }]}> 
						<Text style={[styles.modalTitle, { color: colors.text }]}>Select target</Text>
						{listForTarget.map(item => (
							<TouchableOpacity key={item.id} style={styles.modalItem} onPress={() => onSelectTarget(item.id as TranslationLang)}>
								<Text style={[styles.modalItemText, { color: colors.text }]}>{item.label}</Text>
							</TouchableOpacity>
						))}
					</View>
				</View>
			</Modal>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		padding: 24,
		gap: 16,
	},
	card: {
		borderRadius: 20,
		padding: 20,
		borderWidth: 1,
		gap: 20,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	rowText: {
		flex: 1,
		marginRight: 12,
	},
	title: {
		fontSize: 16,
		fontWeight: '600',
	},
	subtitle: {
		fontSize: 13,
		marginTop: 4,
	},
	selector: {
		paddingVertical: 12,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderColor: 'rgba(0,0,0,0.08)',
	},
	selectorLabel: {
		fontSize: 12,
		marginBottom: 4,
		textTransform: 'uppercase',
		letterSpacing: 1,
	},
	selectorValue: {
		fontSize: 16,
		fontWeight: '600',
	},
	info: {
		fontSize: 12,
	},
	modalWrap: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.4)',
		justifyContent: 'center',
		padding: 24,
	},
	modalOverlay: {
		...StyleSheet.absoluteFillObject,
	},
	modalBody: {
		borderRadius: 16,
		padding: 20,
		gap: 12,
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '600',
		marginBottom: 8,
	},
	modalItem: {
		paddingVertical: 10,
	},
	modalItemText: {
		fontSize: 16,
	},
});

export default TranslationSettingsScreen;
