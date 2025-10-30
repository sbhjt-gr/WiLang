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
	const isProcessingRef = useRef(false);

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

	const enabledRef = useRef(opts.enabled);
	const streamRef = useRef(opts.remoteStream);
	const lastStreamIdRef = useRef<string | null>(null);

	const getStreamId = (stream: MediaStream | null | undefined): string | null => {
		if (!stream) return null;
		const tracks = stream.getAudioTracks();
		return tracks.length > 0 ? tracks[0].id : null;
	};

	const start = useCallback(async () => {
		if (isProcessingRef.current) {
			return;
		}
		
		const currentStream = streamRef.current;
		const currentEnabled = enabledRef.current;
		
		if (!currentStream || !currentEnabled) {
			setError('No remote stream available');
			return;
		}

		isProcessingRef.current = true;
		try {
			await stop();

			const audioTracks = currentStream.getAudioTracks();
			if (audioTracks.length === 0) {
				setError('No audio tracks in remote stream');
				return;
			}

			setError(null);
			
			const tempDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
			if (!tempDir) {
				setError('No temp directory available');
				setIsRecording(false);
				return;
			}

			const tempFile = `${tempDir}remote_audio_${Date.now()}.wav`;
			
			setError('Remote audio capture requires native implementation. Using microphone as fallback.');
			setIsRecording(false);
			setAudioFileUri(null);
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to start recording';
			setError(msg);
			setIsRecording(false);
		} finally {
			isProcessingRef.current = false;
		}
	}, [stop]);

	useEffect(() => {
		enabledRef.current = opts.enabled;
		streamRef.current = opts.remoteStream;
		
		const currentStreamId = getStreamId(opts.remoteStream);
		const lastStreamId = lastStreamIdRef.current;
		
		if (isProcessingRef.current) {
			return;
		}
		
		if (opts.enabled && opts.remoteStream && currentStreamId !== lastStreamId) {
			lastStreamIdRef.current = currentStreamId;
			start();
		} else if (!opts.enabled || !opts.remoteStream) {
			lastStreamIdRef.current = null;
			stop();
		}
		
		return () => {
			stop();
		};
	}, [opts.enabled, opts.remoteStream]);

	return {
		audioFileUri,
		isRecording,
		error,
		start,
		stop,
	};
};

