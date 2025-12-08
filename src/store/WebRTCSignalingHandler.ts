import {RTCPeerConnection, RTCIceCandidate, RTCSessionDescription} from '@livekit/react-native-webrtc';
import {User} from './WebRTCTypes';
import {WebRTCSocketManager} from './WebRTCSocketManager';

export class WebRTCSignalingHandler {
  private socketManager: WebRTCSocketManager;
  private peerConnections: Map<string, RTCPeerConnection>;
  private meetingId: string = '';
  private peerId: string = '';
  private pendingIceCandidates: Map<string, any[]> = new Map();

  private onOfferError?: (error: any, user: User, pc: RTCPeerConnection) => void;

  constructor(socketManager: WebRTCSocketManager, peerConnections: Map<string, RTCPeerConnection>) {
    this.socketManager = socketManager;
    this.peerConnections = peerConnections;
  }

  setCallbacks(callbacks: {
    onOfferError?: (error: any, user: User, pc: RTCPeerConnection) => void;
  }) {
    this.onOfferError = callbacks.onOfferError;
  }

  setPeerId(peerId: string) {
    this.peerId = peerId;
  }

  setMeetingId(meetingId: string) {
    this.meetingId = meetingId;
  }

  async createAndSendOffer(pc: RTCPeerConnection, user: User): Promise<void> {
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      await pc.setLocalDescription(offer);

      this.socketManager.sendOffer(offer.sdp, user.peerId, this.meetingId);
    } catch (error) {
      this.handleOfferError(error, user, pc);
    }
  }

  private handleOfferError(error: any, user: User, pc: RTCPeerConnection): void {
    if (this.onOfferError) {
      this.onOfferError(error, user, pc);
    }
  }

  async handleOffer(data: any): Promise<void> {
    const pc = this.peerConnections.get(data.from);
    if (!pc) {
      return;
    }

    try {
      if (pc.remoteDescription) {
        if (pc.signalingState === 'stable') {
          return;
        }
      }

      const remoteDesc = new RTCSessionDescription({
        type: 'offer',
        sdp: data.offer,
      });

      await pc.setRemoteDescription(remoteDesc);

      await this.flushPendingIceCandidates(data.from, pc);

      const answer = await pc.createAnswer();

      await pc.setLocalDescription(answer);

      this.socketManager.sendAnswer(answer.sdp, data.from, this.meetingId);
    } catch (error) {
      if (this.onOfferError) {
        this.onOfferError(error, { id: data.from, username: data.from, peerId: data.from } as User, pc);
      }
    }
  }

  async handleAnswer(data: any): Promise<void> {
    const pc = this.peerConnections.get(data.from);
    if (!pc) {
      return;
    }

    try {
      if (pc.signalingState !== 'have-local-offer') {
        if (pc.signalingState === 'stable') {
          return;
        }
      }

      const remoteDesc = new RTCSessionDescription({
        type: 'answer',
        sdp: data.answer,
      });

      await pc.setRemoteDescription(remoteDesc);
      await this.flushPendingIceCandidates(data.from, pc);
    } catch (error) {
      if (this.onOfferError) {
        this.onOfferError(error, { id: data.from, username: data.from, peerId: data.from } as User, pc);
      }
    }
  }

  async handleIceCandidate(data: any): Promise<void> {
    const pc = this.peerConnections.get(data.from);
    if (!pc) {
      return;
    }

    try {
      if (!pc.remoteDescription) {
        const queue = this.pendingIceCandidates.get(data.from) || [];
        queue.push(data.candidate);
        this.pendingIceCandidates.set(data.from, queue);
        return;
      }

      const candidate = new RTCIceCandidate(data.candidate);
      await pc.addIceCandidate(candidate);
    } catch (error) {
      if (this.onOfferError) {
        this.onOfferError(error, { id: data.from, username: data.from, peerId: data.from } as User, pc);
      }
    }
  }

  private async flushPendingIceCandidates(peerId: string, pc: RTCPeerConnection) {
    const pending = this.pendingIceCandidates.get(peerId);
    if (!pending || pending.length === 0) {
      return;
    }
    for (const candidateInit of pending) {
      const candidate = new RTCIceCandidate(candidateInit);
      await pc.addIceCandidate(candidate);
    }
    this.pendingIceCandidates.delete(peerId);
  }
}
