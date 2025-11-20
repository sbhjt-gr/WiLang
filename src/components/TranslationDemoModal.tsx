import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

import { useTheme } from '../theme';
import useAudioRecorder from '../hooks/useAudioRecorder';
import ReplicateTranslationService, {
	SpeechTranslationResult,
} from '../services/ReplicateTranslationService';

const LANG_OPTIONS = [
	{ id: 'eng', label: 'English' },
	{ id: 'spa', label: 'Spanish' },
	{ id: 'fra', label: 'French' },
	{ id: 'deu', label: 'German' },
];

const formatError = (error: unknown): string => {
	if (error instanceof Error) {
		return error.message;
	}
	return 'Something went wrong while translating.';
};

type Props = {
	visible: boolean;
	onClose: () => void;
};

export const TranslationDemoModal: React.FC<Props> = ({ visible, onClose }) => {
	const { colors } = useTheme();
	const [targetLanguage, setTargetLanguage] = useState(LANG_OPTIONS[0].id);
	const [result, setResult] = useState<SpeechTranslationResult | null>(null);
	const [statusMessage, setStatusMessage] = useState('Idle');
	const [error, setError] = useState<string | null>(null);
	const [isTranslating, setIsTranslating] = useState(false);
	const recorder = useAudioRecorder();
	const playerRef = useRef<AudioPlayer | null>(null);

	useEffect(() => {
		return () => {
			playerRef.current?.remove?.();
			playerRef.current = null;
		};
	}, []);

	const replicateReady = useMemo(() => ReplicateTranslationService.isConfigured(), []);

	const toggleRecording = useCallback(async () => {
		setError(null);
		setStatusMessage('');
		if (recorder.isRecording) {
			await recorder.stopRecording();
			setStatusMessage('Recording saved');
			return;
		}
		await recorder.startRecording();
		setStatusMessage('Recording…');
	}, [recorder]);

	const handleTranslate = useCallback(async () => {
		if (!recorder.audioUri) {
			setError('Record a sample first.');
			return;
		}
		if (!replicateReady) {
			setError('Add your Replicate API token to .env to try the demo.');
			return;
		}
		setIsTranslating(true);
		setError(null);
		setStatusMessage('Uploading audio…');
		try {
			const output = await ReplicateTranslationService.translateSpeech({
				fileUri: recorder.audioUri,
				targetLanguage,
				mode: 'speech_to_speech',
			});
			setResult(output);
			setStatusMessage('Translation complete');
		} catch (err) {
			setError(formatError(err));
			setStatusMessage('Translation failed');
		} finally {
			setIsTranslating(false);
		}
	}, [recorder.audioUri, replicateReady, targetLanguage]);

	const handlePlayTranslation = useCallback(async () => {
		if (!result?.audioUrl) {
			return;
		}
		try {
			if (!playerRef.current) {
				playerRef.current = createAudioPlayer(result.audioUrl);
			} else {
				playerRef.current.replace(result.audioUrl);
			}
			playerRef.current.play();
		} catch (err) {
			setError(formatError(err));
		}
	}, [result?.audioUrl]);

	const handleClose = useCallback(() => {
		recorder.resetRecording();
		setResult(null);
		setStatusMessage('Idle');
		setError(null);
		onClose();
	}, [onClose, recorder]);

	const recorderStatus = recorder.isRecording
		? 'Recording…'
		: recorder.audioUri
			? 'Ready to send'
			: 'Idle';

	return (
		<Modal visible={visible} animationType="slide" transparent>
			<View style={styles.backdrop}>
				<View style={[styles.container, { backgroundColor: colors.surface }]}
					testID="translation-demo-modal"
				>
					<View style={styles.header}>
						<View>
							<Text style={[styles.title, { color: colors.text }]}>Realtime S2S Demo</Text>
							<Text style={[styles.subtitle, { color: colors.textSecondary }]}>Capture a short sentence and run it through SeamlessM4T on Replicate.</Text>
						</View>
						<TouchableOpacity onPress={handleClose} style={styles.closeButton}>
							<Ionicons name="close" size={22} color={colors.text} />
						</TouchableOpacity>
					</View>

					<ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
						<View style={[styles.card, { borderColor: colors.border }]}> 
							<Text style={[styles.cardTitle, { color: colors.text }]}>
								1. Record a sample
							</Text>
							<Text style={[styles.cardBody, { color: colors.textSecondary }]}>
								Keep it short (~5s). Tap once to start and again to stop.
							</Text>
							<View style={styles.statusRow}>
								<Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Recorder</Text>
								<Text style={[styles.statusValue, { color: colors.text }]}>{recorderStatus}</Text>
							</View>
							<TouchableOpacity
								style={[styles.primaryButton, recorder.isRecording && styles.primaryButtonActive]}
								onPress={toggleRecording}
							>
								<Ionicons
									name={recorder.isRecording ? 'stop-circle' : 'mic-outline'}
									size={20}
									color="#fff"
								/>
								<Text style={styles.primaryButtonText}>
									{recorder.isRecording ? 'Stop Recording' : 'Start Recording'}
								</Text>
							</TouchableOpacity>
						</View>

						<View style={[styles.card, { borderColor: colors.border }]}> 
							<Text style={[styles.cardTitle, { color: colors.text }]}>
								2. Pick a target language
							</Text>
							<Text style={[styles.cardBody, { color: colors.textSecondary }]}>
								Replicate SeamlessM4T expects ISO-639-3 codes.
							</Text>
							<View style={styles.chipRow}>
								{LANG_OPTIONS.map(option => (
									<TouchableOpacity
										key={option.id}
										style={[
											styles.chip,
											targetLanguage === option.id && [styles.chipActive, { backgroundColor: '#8b5cf6' }],
										]}
										onPress={() => setTargetLanguage(option.id)}
									>
										<Text
											style={[
												styles.chipText,
												targetLanguage === option.id && { color: '#fff', fontWeight: '600' },
											]}
										>
											{option.label}
										</Text>
									</TouchableOpacity>
								))}
							</View>
						</View>

						<View style={[styles.card, { borderColor: colors.border }]}> 
							<Text style={[styles.cardTitle, { color: colors.text }]}>
								3. Send to Replicate
							</Text>
							<Text style={[styles.cardBody, { color: colors.textSecondary }]}>
								We upload the clip via the Replicate files API, trigger SeamlessM4T, then poll for results.
							</Text>
							<View style={styles.statusRow}>
								<Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Status</Text>
								<View style={styles.statusValueRow}>
									{isTranslating && <ActivityIndicator size="small" color="#8b5cf6" style={{ marginRight: 6 }} />}
									<Text style={[styles.statusValue, { color: colors.text }]}>
										{statusMessage}
									</Text>
								</View>
							</View>
							<TouchableOpacity
								disabled={!recorder.audioUri || isTranslating}
								style={[
									styles.secondaryButton,
									(!recorder.audioUri || isTranslating) && styles.secondaryButtonDisabled,
								]}
								onPress={handleTranslate}
							>
								<Ionicons name="cloud-upload-outline" size={18} color="#8b5cf6" />
								<Text style={styles.secondaryButtonText}>Translate with Seamless</Text>
							</TouchableOpacity>

							{result && (
								<View style={styles.resultBox}>
									<Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Translation</Text>
									<Text style={[styles.resultText, { color: colors.text }]}>
										{result.translatedText || 'No text returned'}
									</Text>
									<View style={styles.resultMeta}>
										<Text style={[styles.metaItem, { color: colors.textSecondary }]}>Detected: {result.detectedLanguage || 'unknown'}</Text>
										<Text style={[styles.metaItem, { color: colors.textSecondary }]}>Target: {result.targetLanguage || targetLanguage}</Text>
									</View>
									{result.audioUrl && (
										<TouchableOpacity style={styles.playbackButton} onPress={handlePlayTranslation}>
											<Ionicons name="play-circle" size={18} color="#fff" />
											<Text style={styles.playbackButtonText}>Play AI audio</Text>
										</TouchableOpacity>
									)}
								</View>
							)}
						</View>

						{!replicateReady && (
							<View style={styles.alertBox}>
								<Text style={styles.alertTitle}>Setup required</Text>
								<Text style={styles.alertBody}>
									Add `REPLICATE_API_TOKEN` to your `.env` and restart the dev server to enable the demo.
								</Text>
							</View>
						)}

						{error && (
							<View style={styles.errorBox}>
								<Ionicons name="warning-outline" size={18} color="#dc2626" />
								<Text style={styles.errorText}>{error}</Text>
							</View>
						)}
					</ScrollView>
				</View>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	backdrop: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.45)',
		justifyContent: 'center',
		padding: 16,
	},
	container: {
		borderRadius: 24,
		padding: 20,
		maxHeight: '90%',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		marginBottom: 12,
	},
	title: {
		fontSize: 20,
		fontWeight: '700',
	},
	subtitle: {
		marginTop: 4,
		fontSize: 14,
	},
	closeButton: {
		padding: 6,
		borderRadius: 16,
	},
	content: {
		flexGrow: 0,
	},
	contentInner: {
		paddingBottom: 16,
	},
	card: {
		borderWidth: 1,
		borderRadius: 16,
		padding: 16,
		marginBottom: 16,
	},
	cardTitle: {
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 4,
	},
	cardBody: {
		fontSize: 13,
		marginBottom: 12,
	},
	statusRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 12,
	},
	statusLabel: {
		fontSize: 12,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	statusValue: {
		fontSize: 14,
		fontWeight: '600',
	},
	statusValueRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	primaryButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 16,
		paddingVertical: 12,
		backgroundColor: '#8b5cf6',
	},
	primaryButtonActive: {
		backgroundColor: '#a855f7',
	},
	primaryButtonText: {
		color: '#fff',
		fontSize: 15,
		fontWeight: '600',
		marginLeft: 8,
	},
	chipRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	chip: {
		borderRadius: 999,
		paddingVertical: 6,
		paddingHorizontal: 14,
		backgroundColor: 'rgba(139,92,246,0.12)',
	},
	chipActive: {
		shadowColor: '#8b5cf6',
		shadowOpacity: 0.2,
		shadowRadius: 6,
		shadowOffset: { width: 0, height: 2 },
	},
	chipText: {
		fontSize: 13,
		color: '#8b5cf6',
		fontWeight: '500',
	},
	secondaryButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 12,
		paddingVertical: 10,
		borderWidth: 1,
		borderColor: '#8b5cf6',
		gap: 8,
	},
	secondaryButtonDisabled: {
		opacity: 0.6,
	},
	secondaryButtonText: {
		color: '#8b5cf6',
		fontWeight: '600',
	},
	resultBox: {
		marginTop: 16,
		borderRadius: 12,
		padding: 14,
		backgroundColor: 'rgba(139,92,246,0.08)',
		gap: 8,
	},
	resultLabel: {
		fontSize: 12,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	resultText: {
		fontSize: 16,
		fontWeight: '600',
	},
	resultMeta: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	metaItem: {
		fontSize: 12,
	},
	playbackButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 12,
		paddingVertical: 10,
		backgroundColor: '#8b5cf6',
		gap: 8,
	},
	playbackButtonText: {
		color: '#fff',
		fontWeight: '600',
	},
	alertBox: {
		borderRadius: 12,
		padding: 12,
		backgroundColor: 'rgba(251,191,36,0.15)',
		marginTop: 8,
	},
	alertTitle: {
		fontWeight: '700',
		marginBottom: 4,
		color: '#b45309',
	},
	alertBody: {
		color: '#92400e',
		fontSize: 13,
	},
	errorBox: {
		marginTop: 12,
		borderRadius: 12,
		padding: 12,
		backgroundColor: 'rgba(220,38,38,0.12)',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	errorText: {
		color: '#b91c1c',
		fontSize: 13,
		flex: 1,
	},
});

export default TranslationDemoModal;
