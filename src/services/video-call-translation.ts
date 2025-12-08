import { EventEmitter } from 'events';
import { mediaDevices, MediaStream, MediaStreamTrack as RNMediaStreamTrack } from '@sbhjt-gr/react-native-webrtc';
import { registerGlobals } from '@sbhjt-gr/react-native';
import {
  PalabraTranslationService,
  PalabraTranslationServiceConfig,
} from './palabra/PalabraTranslationService';
import { RemoteTrackInfo } from './palabra/PalabraLiveKitTransport';
import {
  SourceLangCode,
  TargetLangCode,
  TranscriptionData,
  TranslationData,
  ConnectionState,
} from './palabra/types';
import { CallTranslationPrefs } from './call-translation-prefs';
import {
  PALABRA_CLIENT_ID,
  PALABRA_CLIENT_SECRET,
  PALABRA_API_BASE_URL,
} from '@env';

registerGlobals();

type VirtTrackPayload = {
  streamId: string;
  tracks: Array<{
    id: string;
    kind: string;
    enabled: boolean;
    readyState: 'live' | 'ended';
    remote: boolean;
    settings: Record<string, unknown>;
    constraints?: Record<string, unknown>;
    peerConnectionId?: number;
  }>;
};

type ExtMediaDevices = typeof mediaDevices & {
  createVirtualAudioTrack?: () => Promise<VirtTrackPayload>;
  pushVirtualAudioSamples?: (samples: Int16Array | number[], sampleRate: number, channels: number) => void;
};

type SampleEvent = {
  samples: number[];
  sampleRate: number;
  channels: number;
};

const rtcDevices = mediaDevices as ExtMediaDevices;

export type TranslationState = 'idle' | 'connecting' | 'active' | 'error';

export interface VideoCallTranslationEvents {
  stateChange: (state: TranslationState) => void;
  transcription: (data: TranscriptionData) => void;
  translation: (data: TranslationData) => void;
  remoteTrack: (tracks: RemoteTrackInfo[]) => void;
  error: (error: Error) => void;
}

export class VideoCallTranslation extends EventEmitter {
  private service: PalabraTranslationService | null = null;
  private state: TranslationState = 'idle';
  private sourceLang: SourceLangCode = 'auto';
  private targetLang: TargetLangCode = 'en-us';
  private audioStream: MediaStream | null = null;
  private remoteAudioTrack: RNMediaStreamTrack | null = null;
  private virtStream: MediaStream | null = null;
  private virtTrack: RNMediaStreamTrack | null = null;
  private sinkCleanup: (() => void) | null = null;
  private sampleBuf: Int16Array | null = null;
  private pushSamples = false;

  constructor() {
    super();
  }

  getState(): TranslationState {
    return this.state;
  }

  getSourceLang(): SourceLangCode {
    return this.sourceLang;
  }

  getTargetLang(): TargetLangCode {
    return this.targetLang;
  }

  private setState(state: TranslationState): void {
    this.state = state;
    this.emit('stateChange', state);
  }

  async loadPrefs(): Promise<void> {
    const prefs = await CallTranslationPrefs.getAll();
    this.sourceLang = prefs.source;
    this.targetLang = prefs.target;
  }

  setLanguages(source: SourceLangCode, target: TargetLangCode): void {
    this.sourceLang = source;
    this.targetLang = target;
    CallTranslationPrefs.setSource(source);
    CallTranslationPrefs.setTarget(target);

    if (this.service) {
      this.service.setSourceLanguage(source);
      this.service.setTargetLanguage(target);
    }
  }

  setRemoteAudioTrack(track: RNMediaStreamTrack | null): void {
    if (this.remoteAudioTrack === track) {
      return;
    }

    if (this.sinkCleanup) {
      this.sinkCleanup();
      this.sinkCleanup = null;
    }

    this.remoteAudioTrack = track;
    console.log('[VideoCallTranslation] remote_track_set:', track ? track.id : 'null');

    if (track && track.remote && typeof track.setAudioSink === 'function') {
      track.setAudioSink(this.handleSamples);
      this.sinkCleanup = () => track.setAudioSink(null);
    }

    if (!track) {
      this.setFeedActive(false);
    }
  }

  async start(): Promise<boolean> {
    if (this.state === 'active' || this.state === 'connecting') {
      console.log('[VideoCallTranslation] already_active');
      return false;
    }

    if (!PALABRA_CLIENT_ID || !PALABRA_CLIENT_SECRET) {
      console.log('[VideoCallTranslation] not_configured');
      this.emit('error', new Error('Palabra not configured'));
      return false;
    }

    this.setState('connecting');

    try {
      if (!this.remoteAudioTrack) {
        console.log('[VideoCallTranslation] no_remote_track_available');
        this.setState('idle');
        return false;
      }

      let audioTrack: MediaStreamTrack | null = await this.getVirtInputTrack();

      if (!audioTrack) {
        const publishableTrack = this.getPublishableRemoteTrack();
        if (publishableTrack) {
          console.log('[VideoCallTranslation] using_remote_audio_track');
          audioTrack = publishableTrack;
        }
      }

      if (!audioTrack) {
        // No usable remote audio track - don't fall back to mic
        console.log('[VideoCallTranslation] remote_track_not_publishable');
        this.setState('idle');
        return false;
      }

      const config: PalabraTranslationServiceConfig = {
        auth: {
          clientId: PALABRA_CLIENT_ID,
          clientSecret: PALABRA_CLIENT_SECRET,
        },
        sourceLanguage: this.sourceLang,
        targetLanguage: this.targetLang,
        apiBaseUrl: PALABRA_API_BASE_URL || 'https://api.palabra.ai',
        onTranscription: (data) => this.emit('transcription', data),
        onTranslation: (data) => this.emit('translation', data),
        onRemoteTrack: (tracks) => this.emit('remoteTrack', tracks),
        onConnectionStateChange: (state) => this.handleConnectionState(state),
        onError: (err) => {
          this.setState('error');
          this.emit('error', err);
        },
      };

      this.service = new PalabraTranslationService(config);
      const success = await this.service.startTranslation(audioTrack);

      if (success) {
        this.setState('active');
        return true;
      } else {
        this.cleanup();
        this.setState('error');
        return false;
      }
    } catch (err) {
      console.log('[VideoCallTranslation] start_err', err);
      this.cleanup();
      this.setState('error');
      this.emit('error', err instanceof Error ? err : new Error('Start failed'));
      return false;
    }
  }

  private cleanup(): void {
    if (this.audioStream) {
      this.audioStream.getTracks().forEach((t) => t.stop());
      this.audioStream = null;
    }

    this.stopVirtResources();
  }

  async stop(): Promise<void> {
    if (this.service) {
      await this.service.cleanup();
      this.service = null;
    }
    this.cleanup();
    this.setState('idle');
  }

  private handleConnectionState(state: ConnectionState): void {
    switch (state) {
      case 'connected':
        this.setState('active');
        break;
      case 'connecting':
      case 'reconnecting':
        if (this.state !== 'active') {
          this.setState('connecting');
        }
        break;
      case 'disconnected':
        break;
    }
  }

  getRemoteTracks(): RemoteTrackInfo[] {
    return this.service?.getRemoteTracks() || [];
  }

  isConfigured(): boolean {
    return Boolean(PALABRA_CLIENT_ID && PALABRA_CLIENT_SECRET);
  }

  private getPublishableRemoteTrack(): MediaStreamTrack | null {
    if (!this.remoteAudioTrack) {
      return null;
    }

    const track = this.remoteAudioTrack as RNMediaStreamTrack & { remote?: boolean };
    if (track.remote) {
      console.log('[VideoCallTranslation] remote_track_receive_only');
      return null;
    }

    return this.remoteAudioTrack as unknown as MediaStreamTrack;
  }

  private async getVirtInputTrack(): Promise<MediaStreamTrack | null> {
    if (!this.remoteAudioTrack) {
      return null;
    }

    const track = await this.ensureVirtTrack();
    if (!track) {
      return null;
    }

    this.setFeedActive(true);
    return track as unknown as MediaStreamTrack;
  }

  private supportsVirtAudio(): boolean {
    const hasCreate = typeof rtcDevices.createVirtualAudioTrack === 'function';
    const hasPush = typeof rtcDevices.pushVirtualAudioSamples === 'function';
    return hasCreate && hasPush;
  }

  private async ensureVirtTrack(): Promise<RNMediaStreamTrack | null> {
    if (this.virtTrack) {
      return this.virtTrack;
    }

    if (!this.supportsVirtAudio()) {
      return null;
    }

    try {
      const payload = await rtcDevices.createVirtualAudioTrack?.();
      if (!payload || !payload.tracks?.length) {
        return null;
      }

      const tracks = payload.tracks.map((track) => {
        const readyState: 'live' | 'ended' = track.readyState === 'ended' ? 'ended' : 'live';
        return {
          constraints: {},
          enabled: track.enabled,
          id: track.id,
          kind: track.kind,
          readyState,
          remote: track.remote,
          settings: track.settings,
          peerConnectionId: -1,
        };
      });

      const stream = new MediaStream({
        streamId: payload.streamId,
        streamReactTag: payload.streamId,
        tracks,
      });

      const audioTrack = stream.getAudioTracks()[0] as RNMediaStreamTrack;
      if (!audioTrack) {
        stream.release();
        return null;
      }

      this.virtStream = stream;
      this.virtTrack = audioTrack;
      console.log('[VideoCallTranslation] virtual_track_ready:', audioTrack.id);
      return audioTrack;
    } catch (err) {
      console.log('[VideoCallTranslation] virtual_track_err', err);
      return null;
    }
  }

  private stopVirtResources(): void {
    this.setFeedActive(false);
    if (this.virtStream) {
      this.virtStream.release();
      this.virtStream = null;
    }
    this.virtTrack = null;
  }

  private setFeedActive(active: boolean): void {
    this.pushSamples = active;
    if (!active) {
      this.sampleBuf = null;
    }
  }

  private handleSamples = (data: SampleEvent): void => {
    if (!this.pushSamples) {
      return;
    }

    const push = rtcDevices.pushVirtualAudioSamples;
    if (!push) {
      return;
    }

    if (!data.samples || data.samples.length === 0) {
      return;
    }

    if (!this.sampleBuf || this.sampleBuf.length !== data.samples.length) {
      this.sampleBuf = new Int16Array(data.samples.length);
    }

    const buf = this.sampleBuf;
    for (let i = 0; i < data.samples.length; i += 1) {
      const v = Math.round(data.samples[i]);
      buf[i] = v < -32768 ? -32768 : v > 32767 ? 32767 : v;
    }

    push(buf, data.sampleRate, data.channels);
  };
}

export const videoCallTranslation = new VideoCallTranslation();
export default videoCallTranslation;
