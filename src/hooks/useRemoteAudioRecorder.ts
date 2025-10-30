import { useCallback, useEffect, useRef, useState } from 'react';
import * as FileSystem from 'expo-file-system';
import type { MediaStream } from 'react-native-webrtc';

type UseRemoteAudioRecorderOptions = {
	enabled: boolean;
	remoteStream: MediaStream | null | undefined;
	chunkDurationMs?: number;
};

type UseRemoteAudioRecorderReturn = {
	audioFileUri: string | null;
	isRecording: boolean;
	error: string | null;
	start: () => Promise<void>;
	stop: () => Promise<void>;
};

export const useRemoteAudioRecorder = (
	opts: UseRemoteAudioRecorderOptions
): UseRemoteAudioRecorderReturn => {
	const [audioFileUri, setAudioFileUri] = useState<string | null>(null);
	const [isRecording, setIsRecording] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const recordingRef = useRef<{
		mediaRecorder: any;
		chunks: Blob[];
		stream: MediaStream | null;
	} | null>(null);
	const chunkIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const currentFileRef = useRef<string | null>(null);

	const stop = useCallback(async () => {
		if (chunkIntervalRef.current) {
			clearInterval(chunkIntervalRef.current);
			chunkIntervalRef.current = null;
		}

		if (recordingRef.current?.mediaRecorder) {
			try {
				if (recordingRef.current.mediaRecorder.state !== 'inactive') {
					recordingRef.current.mediaRecorder.stop();
				}
			} catch (err) {
				console.error('stop_recorder_error', err);
			}
		}

		if (currentFileRef.current) {
			try {
				const exists = await FileSystem.getInfoAsync(currentFileRef.current);
				if (exists.exists) {
					await FileSystem.deleteAsync(currentFileRef.current, { idempotent: true });
				}
			} catch (err) {
				console.error('delete_temp_file_error', err);
			}
			currentFileRef.current = null;
		}

		recordingRef.current = null;
		setIsRecording(false);
		setAudioFileUri(null);
	}, []);

	const start = useCallback(async () => {
		if (!opts.remoteStream || !opts.enabled) {
			setError('No remote stream available');
			return;
		}

		try {
			await stop();

			const audioTracks = opts.remoteStream.getAudioTracks();
			if (audioTracks.length === 0) {
				setError('No audio tracks in remote stream');
				return;
			}

			const tempDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
			const tempFile = `${tempDir}remote_audio_${Date.now()}.wav`;

			setError('Remote audio recording requires native implementation');
			setIsRecording(false);
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to start recording';
			setError(msg);
			setIsRecording(false);
		}
	}, [opts.remoteStream, opts.enabled, opts.chunkDurationMs, stop]);

	useEffect(() => {
		if (opts.enabled && opts.remoteStream) {
			start();
		} else {
			stop();
		}
		return () => {
			stop();
		};
	}, [opts.enabled, opts.remoteStream, start, stop]);

	return {
		audioFileUri,
		isRecording,
		error,
		start,
		stop,
	};
};

