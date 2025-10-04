import {MediaStream, RTCPeerConnection} from 'react-native-webrtc';
import {User} from './WebRTCTypes';
import {ICE_SERVERS} from './WebRTCConfig';
import {WebRTCSocketManager} from './WebRTCSocketManager';
import {WebRTCSignalingHandler} from './WebRTCSignalingHandler';

export class WebRTCPeerManager {
  private peerConnections = new Map<string, RTCPeerConnection>();
  private localStream: MediaStream | null = null;
  private remoteStreams = new Map<string, MediaStream>();
  private socketManager: WebRTCSocketManager;
  private signalingHandler: WebRTCSignalingHandler;
  private peerId: string = '';
  private currentMeetingId: string | null = null;
  
  private onRemoteStreamAdded?: (peerId: string, stream: MediaStream) => void;
  private onConnectionStateChanged?: (peerId: string, state: string) => void;
  private onParticipantUpdated?: (peerId: string, updates: Partial<User>) => void;

  constructor(socketManager: WebRTCSocketManager) {
    this.socketManager = socketManager;
    this.signalingHandler = new WebRTCSignalingHandler(socketManager, this.peerConnections);
  }

  setCallbacks(callbacks: {
    onRemoteStreamAdded?: (peerId: string, stream: MediaStream) => void;
    onConnectionStateChanged?: (peerId: string, state: string) => void;
    onParticipantUpdated?: (peerId: string, updates: Partial<User>) => void;
  }) {
    this.onRemoteStreamAdded = callbacks.onRemoteStreamAdded;
    this.onConnectionStateChanged = callbacks.onConnectionStateChanged;
    this.onParticipantUpdated = callbacks.onParticipantUpdated;
  }

  setLocalStream(stream: MediaStream) {
    this.localStream = stream;
  }

  setPeerId(peerId: string) {
    this.peerId = peerId;
    this.signalingHandler.setPeerId(peerId);
  }

  setMeetingId(meetingId: string) {
    this.currentMeetingId = meetingId;
    this.signalingHandler.setMeetingId(meetingId);
  }

  createPeerConnection(user: User, isInitiator: boolean): RTCPeerConnection | null {
    if (!user.peerId) {
      return null;
    }

    const existingPc = this.peerConnections.get(user.peerId);
    if (existingPc) {
      if (existingPc.connectionState === 'connected' || 
          existingPc.connectionState === 'connecting' ||
          existingPc.connectionState === 'new') {
        return existingPc;
      } else {
        existingPc.close();
        this.peerConnections.delete(user.peerId);
      }
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peerConnections.set(user.peerId, pc);

    this.addLocalTracksToConnection(pc, user);
    this.setupPeerConnectionEvents(pc, user);
    
    if (isInitiator) {
      this.signalingHandler.createAndSendOffer(pc, user);
    }
    
    return pc;
  }

  private addLocalTracksToConnection(pc: RTCPeerConnection, user: User) {
    if (!this.localStream) {
      return;
    }

    this.localStream.getTracks().forEach((track) => {
      try {
        pc.addTrack(track, this.localStream!);
      } catch (_error) {
      }
    });
  }

  private setupPeerConnectionEvents(pc: RTCPeerConnection, user: User) {
    pc.addEventListener('track', (event: any) => {
      this.handleRemoteTrack(event, user);
    });

    pc.addEventListener('icecandidate', (event: any) => {
      if (!event.candidate) {
        return;
      }
      const meetingId = this.currentMeetingId;
      if (!meetingId) {
        return;
      }
      this.socketManager.sendIceCandidate(event.candidate, user.peerId, meetingId);
    });

    pc.addEventListener('connectionstatechange', () => {
      const state = pc.connectionState;
      
      if (this.onConnectionStateChanged) {
        this.onConnectionStateChanged(user.peerId, state);
      }

      if (state === 'failed') {
        pc.restartIce();
        setTimeout(() => {
          if (pc.connectionState === 'failed') {
            this.remoteStreams.delete(user.peerId);
          }
        }, 5000);
      } else if (state === 'closed') {
        this.remoteStreams.delete(user.peerId);
      }
    });

    pc.addEventListener('iceconnectionstatechange', () => {
      const state = pc.iceConnectionState;
      if (state === 'failed') {
        pc.restartIce();
      }
    });

    pc.addEventListener('icegatheringstatechange', () => {});
    pc.addEventListener('signalingstatechange', () => {});

    pc.addEventListener('negotiationneeded', () => {
      if (pc.connectionState !== 'connected') {
        return;
      }
      if (this.peerId > user.peerId && pc.signalingState === 'stable') {
        this.signalingHandler.createAndSendOffer(pc, user);
      }
    });
  }

  private handleRemoteTrack(event: any, user: User) {
    let remoteStream = event.streams && event.streams.length > 0 ? event.streams[0] : null;
    if (!remoteStream) {
      const existing = this.remoteStreams.get(user.peerId) || new MediaStream();
      const hasTrack = existing.getTracks().some((track: any) => track.id === event.track.id);
      if (!hasTrack) {
        existing.addTrack(event.track);
      }
      remoteStream = existing;
    }

    const existingStream = this.remoteStreams.get(user.peerId);
    if (existingStream && existingStream !== remoteStream) {
      const existingTrackIds = new Set(existingStream.getTracks().map(track => track.id));
      remoteStream.getTracks().forEach((track: any) => {
        if (!existingTrackIds.has(track.id)) {
          existingStream.addTrack(track);
        }
      });
      remoteStream = existingStream;
    }

    this.remoteStreams.set(user.peerId, remoteStream);
    
    if (this.onRemoteStreamAdded) {
      this.onRemoteStreamAdded(user.peerId, remoteStream);
    }
  }

  async handleOffer(data: any): Promise<void> {
    return this.signalingHandler.handleOffer(data);
  }

  async handleAnswer(data: any): Promise<void> {
    return this.signalingHandler.handleAnswer(data);
  }

  async handleIceCandidate(data: any): Promise<void> {
    return this.signalingHandler.handleIceCandidate(data);
  }

  getPeerConnection(peerId: string): RTCPeerConnection | undefined {
    return this.peerConnections.get(peerId);
  }

  getRemoteStream(peerId: string): MediaStream | undefined {
    return this.remoteStreams.get(peerId);
  }

  getAllRemoteStreams(): Map<string, MediaStream> {
    return new Map(this.remoteStreams);
  }

  closePeerConnection(peerId: string): void {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
      this.remoteStreams.delete(peerId);
    }
  }

  closeAllConnections(): void {
    this.peerConnections.forEach((pc) => {
      pc.close();
    });
    this.peerConnections.clear();
    this.remoteStreams.clear();
  }

  getConnectionCount(): number {
    return this.peerConnections.size;
  }

  getActiveConnections(): string[] {
    const active: string[] = [];
    this.peerConnections.forEach((pc, peerId) => {
      if (pc.connectionState === 'connected') {
        active.push(peerId);
      }
    });
    return active;
  }
}
