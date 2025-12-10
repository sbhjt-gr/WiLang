import { useCallback, useEffect, useMemo, useState } from 'react';
import * as FileSystem from 'expo-file-system';
import {
	AudioQuality,
	IOSOutputFormat,
	requestRecordingPermissionsAsync,
	getRecordingPermissionsAsync,
	setAudioModeAsync,
	useAudioRecorder as useExpoAudioRecorder,
	useAudioRecorderState,
	type AudioRecorder,
	type RecorderState,
	type RecordingOptions,
} from 'expo-audio';
import type { PermissionStatus } from 'expo-modules-core';

export type UseAudioRecorderResult = {
	recorder: AudioRecorder;
	state: RecorderState;
	permissionStatus: PermissionStatus | 'unknown';
	isRecording: boolean;
	isProcessing: boolean;
	audioUri: string | null;
	error: string | null;
	startRecording: () => Promise<void>;
	stopRecording: () => Promise<string | null>;
	resetRecording: () => Promise<void>;
	ensurePermission: () => Promise<boolean>;
};

const DEFAULT_OPTIONS: RecordingOptions = {
	isMeteringEnabled: true,
	extension: '.m4a',
	sampleRate: 44_100,
	numberOfChannels: 1,
	bitRate: 128_000,
	android: {
		outputFormat: 'mpeg4',
		audioEncoder: 'aac',
	},
	ios: {
		audioQuality: AudioQuality.HIGH,
		outputFormat: IOSOutputFormat.MPEG4AAC,
	},
	web: {
		mimeType: 'audio/webm',
	},
};

const setRecordingAudioMode = async () =>
	setAudioModeAsync({
		allowsRecording: true,
		playsInSilentMode: true,
		shouldPlayInBackground: false,
		shouldRouteThroughEarpiece: false,
		interruptionMode: 'mixWithOthers',
		interruptionModeAndroid: 'duckOthers',
	});

const extractUri = (recorder: AudioRecorder, state: RecorderState): string | null => {
	if (recorder?.uri) {
		return recorder.uri;
	}
	if (state?.url) {
		return state.url;
	}
	return null;
};

const formatError = (error: unknown): string => {
	if (error instanceof Error) {
		return error.message;
	}
	return 'Something went wrong while working with the microphone.';
};

export const useAudioRecorder = (options: Partial<RecordingOptions> = {}): UseAudioRecorderResult => {
	const recordingOptions = useMemo(() => ({
		...DEFAULT_OPTIONS,
		...options,
		android: {
			...DEFAULT_OPTIONS.android,
			...options.android,
		},
		ios: {
			...DEFAULT_OPTIONS.ios,
			...options.ios,
		},
		web: {
			...DEFAULT_OPTIONS.web,
			...options.web,
		},
	}), [options]);

	const recorder = useExpoAudioRecorder(recordingOptions);
	const state = useAudioRecorderState(recorder, 200);
	const [permissionStatus, setPermissionStatus] = useState<PermissionStatus | 'unknown'>('unknown');
	const [audioUri, setAudioUri] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);

	useEffect(() => {
		(async () => {
			try {
				const response = await getRecordingPermissionsAsync();
				setPermissionStatus(response.status);
			} catch (err) {
				console.warn('mic_permission_check_error', err);
			}
		})();
	}, []);

	const ensurePermission = useCallback(async () => {
		try {
			const response = await requestRecordingPermissionsAsync();
			setPermissionStatus(response.status);
			return response.granted;
		} catch (err) {
			setError(formatError(err));
			return false;
		}
	}, []);

	const startRecording = useCallback(async () => {
		if (state.isRecording || isProcessing) {
			return;
		}
		setError(null);
		const granted = await ensurePermission();
		if (!granted) {
			setError('Microphone permission is required to start recording.');
			return;
		}
		setIsProcessing(true);
		try {
			await setRecordingAudioMode();
			await recorder.prepareToRecordAsync(recordingOptions);
			recorder.record();
			setAudioUri(null);
		} catch (err) {
			setError(formatError(err));
		} finally {
			setIsProcessing(false);
		}
	}, [ensurePermission, recorder, recordingOptions, state.isRecording, isProcessing]);

	const stopRecording = useCallback(async () => {
		if (!state.isRecording) {
			return audioUri;
		}
		setIsProcessing(true);
		try {
			await recorder.stop();
			const uri = extractUri(recorder, state);
			setAudioUri(uri);
			return uri;
		} catch (err) {
			setError(formatError(err));
			return null;
		} finally {
			setIsProcessing(false);
		}
	}, [audioUri, recorder, state]);

	const resetRecording = useCallback(async () => {
		setError(null);
		const uri = extractUri(recorder, state) || audioUri;
		if (uri) {
			try {
				await FileSystem.deleteAsync(uri, { idempotent: true });
			} catch (err) {
				console.warn('delete_recording_error', err);
			}
		}
		setAudioUri(null);
	}, [audioUri, recorder, state]);

	return {
		recorder,
		state,
		permissionStatus,
		isRecording: state.isRecording,
		isProcessing,
		audioUri,
		error,
		startRecording,
		stopRecording,
		resetRecording,
		ensurePermission,
	};
};

export default useAudioRecorder;
