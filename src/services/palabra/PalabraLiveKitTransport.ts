/**
 * Palabra LiveKit Transport for React Native
 *
 * This module handles real-time audio streaming to Palabra AI using LiveKit.
 * It manages:
 * - LiveKit room connection
 * - Local audio track publishing (microphone input)
 * - Remote audio track subscription (translated speech)
 * - Data channel for transcriptions and translations
 */

import { EventEmitter } from 'events';
import {
  Room,
  RoomEvent,
  LocalAudioTrack,
  RemoteTrack,
  RemoteParticipant,
  RemoteTrackPublication,
  Track,
  ConnectionState,
} from 'livekit-client';
import {
  PipelineConfig,
  PalabraEventTypes,
  TranscriptionData,
  TranslationData,
  SourceLangCode,
  TargetLangCode,
} from './types';

export interface RemoteTrackInfo {
  trackId: string;
  track: MediaStreamTrack;
  language: string;
  participant: string;
}

export interface PalabraLiveKitTransportConfig {
  streamUrl: string;
  accessToken: string;
  sourceLanguage?: SourceLangCode;
  targetLanguage?: TargetLangCode;
  onTranscription?: (data: TranscriptionData) => void;
  onTranslation?: (data: TranslationData) => void;
  onRemoteTrack?: (tracks: RemoteTrackInfo[]) => void;
  onConnectionStateChange?: (state: ConnectionState) => void;
  onError?: (error: Error) => void;
}

interface DataReceivedPayload {
  message_type: string;
  data?: unknown;
}

interface TranscriptionPayload {
  transcription?: {
    language?: string;
    text?: string;
    transcription_id?: string;
    segments?: Array<{
      start: number;
      end: number;
      text: string;
    }>;
  };
}

interface ErrorPayload {
  code?: string;
  desc?: string;
  param?: unknown;
}

export class PalabraLiveKitTransport extends EventEmitter {
  private room: Room;
  private streamUrl: string;
  private accessToken: string;
  private localAudioTrack: LocalAudioTrack | null = null;
  private remoteTracks = new Map<string, RemoteTrackInfo>();
  private connectionState: ConnectionState = ConnectionState.Disconnected;
  private sourceLanguage?: SourceLangCode;
  private targetLanguage?: TargetLangCode;

  // Callbacks
  private onTranscription?: (data: TranscriptionData) => void;
  private onTranslation?: (data: TranslationData) => void;
  private onRemoteTrack?: (tracks: RemoteTrackInfo[]) => void;
  private onConnectionStateChange?: (state: ConnectionState) => void;
  private onError?: (error: Error) => void;

  constructor(config: PalabraLiveKitTransportConfig) {
    super();

    this.room = new Room();
    this.streamUrl = config.streamUrl;
    this.accessToken = config.accessToken;
    this.sourceLanguage = config.sourceLanguage;
    this.targetLanguage = config.targetLanguage;
    this.onTranscription = config.onTranscription;
    this.onTranslation = config.onTranslation;
    this.onRemoteTrack = config.onRemoteTrack;
    this.onConnectionStateChange = config.onConnectionStateChange;
    this.onError = config.onError;

    this.setupRoomEventHandlers();
  }

  /**
   * Connect to LiveKit room and start publishing audio
   */
  async connect(audioTrack: MediaStreamTrack): Promise<void> {
    try {
      console.log('[PalabraTransport] Connecting to LiveKit room:', this.streamUrl);

      await this.room.connect(this.streamUrl, this.accessToken, {
        autoSubscribe: true,
      });

      console.log('[PalabraTransport] Connected, publishing audio track');

      // Create and publish local audio track
      this.localAudioTrack = new LocalAudioTrack(audioTrack);
      await this.room.localParticipant.publishTrack(this.localAudioTrack, {
        dtx: false,
        red: false,
        audioPreset: {
          maxBitrate: 32000,
        },
      });

      console.log('[PalabraTransport] Audio track published successfully');
    } catch (error) {
      console.error('[PalabraTransport] Connection failed:', error);
      this.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Send pipeline configuration to Palabra
   */
  async setTask(config: PipelineConfig): Promise<void> {
    try {
      console.log('[PalabraTransport] Setting task:', JSON.stringify(config));
      await this.sendCommand('set_task', config);
    } catch (error) {
      console.error('[PalabraTransport] Failed to set task:', error);
      throw error;
    }
  }

  /**
   * End the current translation task
   */
  async endTask(): Promise<void> {
    try {
      console.log('[PalabraTransport] Ending task');
      await this.sendCommand('end_task', { force: false });
    } catch (error) {
      console.error('[PalabraTransport] Failed to end task:', error);
    }
  }

  /**
   * Pause the translation task
   */
  async pauseTask(): Promise<void> {
    try {
      console.log('[PalabraTransport] Pausing task');
      await this.sendCommand('pause_task', {});
    } catch (error) {
      console.error('[PalabraTransport] Failed to pause task:', error);
    }
  }

  /**
   * Disconnect from LiveKit room
   */
  async disconnect(): Promise<void> {
    try {
      console.log('[PalabraTransport] Disconnecting');

      await this.endTask();
      await this.room.disconnect();
      this.cleanup();

      console.log('[PalabraTransport] Disconnected');
    } catch (error) {
      console.error('[PalabraTransport] Disconnect error:', error);
      this.cleanup();
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionState === ConnectionState.Connected;
  }

  /**
   * Get all remote audio tracks
   */
  getRemoteTracks(): RemoteTrackInfo[] {
    return Array.from(this.remoteTracks.values());
  }

  // Private methods

  private async sendCommand(messageType: string, data: unknown): Promise<void> {
    const payload = JSON.stringify({ message_type: messageType, data });
    const encoder = new TextEncoder();
    await this.room.localParticipant.publishData(encoder.encode(payload), {
      reliable: true,
    });
  }

  private setupRoomEventHandlers(): void {
    this.room.on(RoomEvent.Connected, () => {
      console.log('[PalabraTransport] Room connected');
      this.emit(PalabraEventTypes.ROOM_CONNECTED);
    });

    this.room.on(RoomEvent.Disconnected, () => {
      console.log('[PalabraTransport] Room disconnected');
      this.emit(PalabraEventTypes.ROOM_DISCONNECTED);
      this.cleanup();
    });

    this.room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
      console.log('[PalabraTransport] Connection state:', state);
      this.connectionState = state;
      this.onConnectionStateChange?.(state);
      this.emit(PalabraEventTypes.CONNECTION_STATE_CHANGED, state);
    });

    this.room.on(
      RoomEvent.TrackSubscribed,
      (
        track: RemoteTrack,
        publication: RemoteTrackPublication,
        participant: RemoteParticipant
      ) => {
        if (track.kind === Track.Kind.Audio) {
          this.handleRemoteAudioTrack(track, publication, participant);
        }
      }
    );

    this.room.on(
      RoomEvent.TrackUnsubscribed,
      (
        track: RemoteTrack,
        publication: RemoteTrackPublication,
        participant: RemoteParticipant
      ) => {
        if (track.kind === Track.Kind.Audio && track.sid) {
          this.removeRemoteTrack(track.sid);
        }
      }
    );

    this.room.on(RoomEvent.DataReceived, (payload, participant, kind, topic) => {
      this.handleDataReceived(payload, participant);
    });

    this.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      console.log('[PalabraTransport] Participant connected:', participant.identity);
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      console.log('[PalabraTransport] Participant disconnected:', participant.identity);
      this.removeTracksByParticipant(participant.identity);
    });
  }

  private handleRemoteAudioTrack(
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ): void {
    try {
      const trackId = track.sid || publication.trackSid;
      console.log('[PalabraTransport] Remote audio track received:', {
        trackId,
        trackName: publication.trackName,
        participant: participant.identity,
      });

      // Extract language from track name (format: "audio_es" or similar)
      const language = publication.trackName?.split('_')[1] || 'unknown';

      const trackInfo: RemoteTrackInfo = {
        trackId,
        track: track.mediaStreamTrack,
        language,
        participant: participant.identity,
      };

      this.remoteTracks.set(trackId, trackInfo);
      this.onRemoteTrack?.(this.getRemoteTracks());
      this.emit(PalabraEventTypes.REMOTE_TRACKS_UPDATE, this.getRemoteTracks());
    } catch (error) {
      console.error('[PalabraTransport] Failed to handle remote track:', error);
    }
  }

  private removeRemoteTrack(trackId: string): void {
    this.remoteTracks.delete(trackId);
    this.onRemoteTrack?.(this.getRemoteTracks());
    this.emit(PalabraEventTypes.REMOTE_TRACKS_UPDATE, this.getRemoteTracks());
  }

  private removeTracksByParticipant(participantId: string): void {
    for (const [trackId, info] of this.remoteTracks.entries()) {
      if (info.participant === participantId) {
        this.remoteTracks.delete(trackId);
      }
    }
    this.onRemoteTrack?.(this.getRemoteTracks());
    this.emit(PalabraEventTypes.REMOTE_TRACKS_UPDATE, this.getRemoteTracks());
  }

  private handleDataReceived(
    payload: Uint8Array,
    participant: RemoteParticipant | undefined
  ): void {
    try {
      const decoder = new TextDecoder();
      const message = decoder.decode(payload);
      const data: DataReceivedPayload = JSON.parse(message);

      console.log('[PalabraTransport] Data received:', data.message_type);

      this.processMessage(data);
    } catch (error) {
      console.error('[PalabraTransport] Failed to parse data:', error);
    }
  }

  private processMessage(data: DataReceivedPayload): void {
    const { message_type, data: rawData } = data;

    if (!message_type) {
      return;
    }

    const messageData = this.tryParseData(rawData);

    switch (message_type) {
      case 'partial_transcription':
      case 'validated_transcription': {
        const payload = messageData as TranscriptionPayload;
        const text = payload?.transcription?.text;
        if (text) {
          const transcription: TranscriptionData = {
            text,
            language: (payload.transcription?.language || 'en') as SourceLangCode,
            isFinal: message_type === 'validated_transcription',
            timestamp: Date.now(),
          };
          this.onTranscription?.(transcription);
          this.emit(PalabraEventTypes.TRANSCRIPTION_RECEIVED, transcription);
        }
        break;
      }

      case 'partial_translated_transcription':
      case 'translated_transcription': {
        const payload = messageData as TranscriptionPayload;
        const text = payload?.transcription?.text;
        if (text) {
          const translation: TranslationData = {
            text,
            sourceLanguage: this.sourceLanguage ?? 'en' as SourceLangCode,
            targetLanguage: this.targetLanguage ?? 'es' as TargetLangCode,
            isFinal: message_type === 'translated_transcription',
            timestamp: Date.now(),
          };
          this.onTranslation?.(translation);
          this.emit(PalabraEventTypes.TRANSLATION_RECEIVED, translation);
        }
        break;
      }

      case 'error': {
        const errorData = messageData as ErrorPayload;
        console.error('[PalabraTransport] Server error:', errorData);
        this.emit(PalabraEventTypes.ERROR_RECEIVED, errorData);
        break;
      }

      case 'pipeline_timings':
        break;

      default:
        console.log('[PalabraTransport] Unhandled:', message_type);
    }
  }

  private tryParseData(data: unknown): unknown {
    if (typeof data === 'object') {
      return data;
    }
    try {
      return JSON.parse(data as string);
    } catch {
      return data;
    }
  }

  private cleanup(): void {
    this.remoteTracks.clear();
    this.localAudioTrack = null;
  }
}
