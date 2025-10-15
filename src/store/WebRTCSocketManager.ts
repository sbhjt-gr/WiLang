import socketio from 'socket.io-client';
import {User} from './WebRTCTypes';
import {SERVER_URL, SERVER_URLS, WEBRTC_CONFIG} from './WebRTCConfig';
import { KeyBundle } from '../crypto';

type SocketInstance = ReturnType<typeof socketio>;

export class WebRTCSocketManager {
  private socket: SocketInstance | null = null;
  private currentMeetingId: string | null = null;
  private peerId = '';
  private username = '';
  private onUserJoined?: (user: User) => void;
  private onUserLeft?: (user: User) => void;
  private onOfferReceived?: (data: any) => void;
  private onAnswerReceived?: (data: any) => void;
  private onIceCandidateReceived?: (data: any) => void;
  private onMeetingEnded?: () => void;
  private onUsersChange?: (users: User[]) => void;
  private onIncomingCall?: (data: any) => void;
  private onCallAccepted?: (data: any) => void;
  private onCallDeclined?: (data: any) => void;
  private onCallCancelled?: (data: any) => void;
  private onKeyBundleReceived?: (data: { fromUserId: string; bundle: KeyBundle }) => void;

  setCallbacks(callbacks: {
    onUserJoined?: (user: User) => void;
    onUserLeft?: (user: User) => void;
    onOfferReceived?: (data: any) => void;
    onAnswerReceived?: (data: any) => void;
    onIceCandidateReceived?: (data: any) => void;
    onMeetingEnded?: () => void;
    onUsersChange?: (users: User[]) => void;
    onIncomingCall?: (data: any) => void;
    onCallAccepted?: (data: any) => void;
    onCallDeclined?: (data: any) => void;
    onCallCancelled?: (data: any) => void;
    onKeyBundleReceived?: (data: { fromUserId: string; bundle: KeyBundle }) => void;
  }) {
    this.onUserJoined = callbacks.onUserJoined;
    this.onUserLeft = callbacks.onUserLeft;
    this.onOfferReceived = callbacks.onOfferReceived;
    this.onAnswerReceived = callbacks.onAnswerReceived;
    this.onIceCandidateReceived = callbacks.onIceCandidateReceived;
    this.onMeetingEnded = callbacks.onMeetingEnded;
    this.onUsersChange = callbacks.onUsersChange;
    this.onIncomingCall = callbacks.onIncomingCall;
    this.onCallAccepted = callbacks.onCallAccepted;
    this.onCallDeclined = callbacks.onCallDeclined;
    this.onCallCancelled = callbacks.onCallCancelled;
    this.onKeyBundleReceived = callbacks.onKeyBundleReceived;
  }

  private async connectWithFallback(urls: string[], username: string): Promise<SocketInstance> {
    for (let i = 0; i < urls.length; i += 1) {
      const url = urls[i];

      try {
        const io = socketio(url, {
          reconnection: true,
          reconnectionAttempts: WEBRTC_CONFIG.reconnectionAttempts,
          reconnectionDelay: WEBRTC_CONFIG.reconnectionDelay,
          autoConnect: true,
          timeout: WEBRTC_CONFIG.timeout,
          transports: ['polling', 'websocket'],
          forceNew: true,
          upgrade: true,
        });

        await new Promise<void>((resolve, reject) => {
          const connectionTimeout = setTimeout(() => {
            io.disconnect();
            reject(new Error(`Connection timeout: ${url}`));
          }, WEBRTC_CONFIG.timeout + 5000);

          io.on('connect', () => {
            clearTimeout(connectionTimeout);
            this.peerId = io.id || '';
            io.emit('register', username);
            io.emit('set-peer-id', io.id);
            resolve();
          });

          io.on('connect_error', (error: any) => {
            clearTimeout(connectionTimeout);
            io.disconnect();
            reject(error);
          });
        });

        return io;
      } catch (error) {
        if (i === urls.length - 1) {
          throw error;
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    throw new Error('All server URLs failed');
  }

  async initializeSocket(username: string): Promise<SocketInstance> {
    this.username = username;

    const primaryUrl = SERVER_URL;
    const fallbackUrls = SERVER_URLS.length > 0 ? SERVER_URLS : [];
    const allUrls = [primaryUrl, ...fallbackUrls].filter(url => url && url !== 'undefined');

    if (allUrls.length === 0) {
      allUrls.push('https://whisperlang-render.onrender.com');
    }

    const io = await this.connectWithFallback(allUrls, username);
    this.socket = io;
    this.setupSocketListeners(io);

    return io;
  }

  private setupSocketListeners(io: SocketInstance) {
    io.on('disconnect', () => {});

    io.on('users-change', (users: User[]) => {
      this.onUsersChange?.(users);
    });

    io.on('user-joined', (user: User) => {
      if (user.peerId === this.peerId) {
        return;
      }

      this.onUserJoined?.(user);
    });

    io.on('user-left', (user: User) => {
      this.onUserLeft?.(user);
    });

    io.on('meeting-ended', () => {
      this.onMeetingEnded?.();
    });

    io.on('offer', (data: any) => {
      const {offer, fromPeerId, fromUsername, meetingId} = data;

      if (meetingId !== this.currentMeetingId) {
        return;
      }

      const transformedData = {
        from: fromPeerId,
        to: this.peerId,
        offer,
        meetingId,
        fromUsername,
      };

      this.onOfferReceived?.(transformedData);
    });

    io.on('answer', (data: any) => {
      const {answer, fromPeerId} = data;

      const transformedData = {
        from: fromPeerId,
        to: this.peerId,
        answer,
        meetingId: this.currentMeetingId,
      };

      this.onAnswerReceived?.(transformedData);
    });

    io.on('ice-candidate', (data: any) => {
      const {candidate, fromPeerId} = data;

      const transformedData = {
        from: fromPeerId,
        to: this.peerId,
        candidate,
        meetingId: this.currentMeetingId,
      };

      this.onIceCandidateReceived?.(transformedData);
    });

    io.on('incoming-call', (data: any) => {
      console.log('incoming_call_received', data);
      this.onIncomingCall?.(data);
    });

    io.on('call-accepted', (data: any) => {
      console.log('call_accepted_received', data);
      this.onCallAccepted?.(data);
    });

    io.on('call-declined', (data: any) => {
      console.log('call_declined_received', data);
      this.onCallDeclined?.(data);
    });

    io.on('call-cancelled', (data: any) => {
      console.log('call_cancelled_received', data);
      this.onCallCancelled?.(data);
    });

    io.on('key-bundle-response', (data: { fromUserId: string; bundle: KeyBundle }) => {
      console.log('key_bundle_received', data.fromUserId);
      this.onKeyBundleReceived?.(data);
    });
  }

  sendOffer(offer: any, targetPeerId: string, meetingId: string) {
    if (!this.socket) {
      throw new Error('Socket not initialized');
    }

    this.socket.emit('offer', {
      offer,
      targetPeerId,
      meetingId,
    });
  }

  sendAnswer(answer: any, targetPeerId: string, meetingId: string) {
    if (!this.socket) {
      throw new Error('Socket not initialized');
    }

    this.socket.emit('answer', {
      answer,
      targetPeerId,
      meetingId,
    });
  }

  sendIceCandidate(candidate: any, targetPeerId: string, meetingId: string) {
    if (!this.socket) {
      throw new Error('Socket not initialized');
    }

    this.socket.emit('ice-candidate', {
      candidate,
      targetPeerId,
      meetingId,
    });
  }

  setMeetingId(meetingId: string) {
    this.currentMeetingId = meetingId;
  }

  registerUser(userData: {
    username: string;
    userId: string;
    phoneNumber?: string;
    peerId?: string;
    fcmToken?: string;
  }) {
    if (!this.socket) {
      throw new Error('Socket not initialized');
    }

    this.socket.emit('register-user', userData);
  }

  initiateCall(callData: {
    recipientUserId?: string;
    recipientPhone?: string;
    callerId: string;
    callerName: string;
    callerPhone?: string;
    callType: string;
  }): Promise<{ success: boolean; callId?: string; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, error: 'Socket not initialized' });
        return;
      }

      this.socket.emit('initiate-call', callData);

      const timeout = setTimeout(() => {
        resolve({ success: false, error: 'timeout' });
      }, 30000);

      this.socket.once('call-initiated', (response: any) => {
        clearTimeout(timeout);
        resolve(response);
      });
    });
  }

  acceptCall(data: { callId: string; callerSocketId: string; meetingId?: string; meetingToken?: string }) {
    if (!this.socket) {
      throw new Error('Socket not initialized');
    }

    this.socket.emit('accept-call-request', data);
  }

  declineCall(data: { callId: string; callerSocketId: string }) {
    if (!this.socket) {
      throw new Error('Socket not initialized');
    }

    this.socket.emit('decline-call-request', data);
  }

  cancelCall(data: { callId: string; recipientSocketId?: string; recipientPhone?: string }) {
    if (!this.socket) {
      throw new Error('Socket not initialized');
    }

    this.socket.emit('cancel-call-request', data);
  }

  getMeetingId(): string | null {
    return this.currentMeetingId;
  }

  getPeerId(): string {
    return this.peerId;
  }

  getSocket(): SocketInstance | null {
    return this.socket;
  }

  uploadKeyBundle(bundle: KeyBundle) {
    if (!this.socket) {
      console.log('upload_key_bundle_no_socket');
      throw new Error('Socket not initialized');
    }

    console.log('uploading_key_bundle', { userId: bundle.userId, hasIdentityKey: !!bundle.identityKey, hasEphemeralKey: !!bundle.ephemeralKey });
    this.socket.emit('upload-key-bundle', bundle);
  }

  requestKeyBundle(userId: string): Promise<KeyBundle | null> {
    return new Promise((resolve) => {
      if (!this.socket) {
        console.log('request_key_bundle_no_socket', userId);
        resolve(null);
        return;
      }

      console.log('requesting_key_bundle_socket', userId);

      const timeout = setTimeout(() => {
        console.log('request_key_bundle_timeout', userId);
        resolve(null);
      }, 5000);

      const responseHandler = (data: { success: boolean; bundle?: KeyBundle }) => {
        clearTimeout(timeout);
        console.log('key_bundle_response_received', { userId, success: data.success, hasBundle: !!data.bundle });
        resolve(data.success && data.bundle ? data.bundle : null);
      };

      this.socket.once('key-bundle-response', responseHandler);
      this.socket.emit('request-key-bundle', userId);
      console.log('key_bundle_request_emitted', userId);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}
