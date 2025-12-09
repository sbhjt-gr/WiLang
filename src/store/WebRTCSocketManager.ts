import socketio from 'socket.io-client';
import { User, JoinRequest } from './WebRTCTypes';
import { SERVER_URL, SERVER_URLS, WEBRTC_CONFIG } from './WebRTCConfig';
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
  private onJoinRequest?: (data: JoinRequest & { meetingId: string }) => void;
  private onJoinApproved?: (data: { meetingId: string; participants: User[]; requestId?: string }) => void;
  private onJoinDenied?: (data: { meetingId: string; reason?: string; requestId?: string }) => void;
  private onDirectCallEnded?: (data: { endedBy: string; endedByName: string; meetingId?: string }) => void;

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
    onJoinRequest?: (data: JoinRequest & { meetingId: string }) => void;
    onJoinApproved?: (data: { meetingId: string; participants: User[]; requestId?: string }) => void;
    onJoinDenied?: (data: { meetingId: string; reason?: string; requestId?: string }) => void;
    onDirectCallEnded?: (data: { endedBy: string; endedByName: string; meetingId?: string }) => void;
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
    this.onJoinRequest = callbacks.onJoinRequest;
    this.onJoinApproved = callbacks.onJoinApproved;
    this.onJoinDenied = callbacks.onJoinDenied;
    this.onDirectCallEnded = callbacks.onDirectCallEnded;
  }

  private async connectWithFallback(urls: string[], username: string): Promise<SocketInstance> {
    console.log('connect_with_fallback_start', { urlCount: urls.length, username });

    for (let i = 0; i < urls.length; i += 1) {
      const url = urls[i];
      console.log('trying_server', { attempt: i + 1, total: urls.length, url });

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

        console.log('socket_instance_created', { url, timeout: WEBRTC_CONFIG.timeout });

        await new Promise<void>((resolve, reject) => {
          const connectionTimeout = setTimeout(() => {
            console.log('connection_timeout_triggered', { url, timeout: WEBRTC_CONFIG.timeout + 5000 });
            io.disconnect();
            reject(new Error(`timeout`));
          }, WEBRTC_CONFIG.timeout + 5000);

          io.on('connect', () => {
            console.log('socket_connected_event', { url, socketId: io.id });
            clearTimeout(connectionTimeout);
            this.peerId = io.id || '';
            console.log('emitting_register', { username, socketId: io.id });
            io.emit('register', username);
            io.emit('set-peer-id', io.id);
            console.log('register_emitted');
            resolve();
          });

          io.on('connect_error', (error: any) => {
            console.log('connect_error_event', { url, error: error.message || error });
            clearTimeout(connectionTimeout);
            io.disconnect();
            reject(error);
          });
        });

        console.log('connection_successful', { url, socketId: io.id });
        return io;
      } catch (error) {
        console.log('connection_attempt_failed', {
          url,
          attempt: i + 1,
          total: urls.length,
          error: error instanceof Error ? error.message : error,
          isLastAttempt: i === urls.length - 1
        });

        if (i === urls.length - 1) {
          console.log('all_connection_attempts_exhausted', { urlCount: urls.length });
          throw error;
        }

        console.log('retrying_next_server', { waitMs: 2000 });
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('fallback_failed_completely');
    throw new Error('All server URLs failed');
  }

  async initializeSocket(username: string): Promise<SocketInstance> {
    console.log('socket_init_start', { username });
    this.username = username;

    const primaryUrl = SERVER_URL;
    const fallbackUrls = SERVER_URLS.length > 0 ? SERVER_URLS : [];
    const allUrls = [primaryUrl, ...fallbackUrls].filter(url => url && url !== 'undefined');

    if (allUrls.length === 0) {
      console.log('no_urls_configured_using_default');
      allUrls.push('https://whisperlang-render.onrender.com');
    }

    console.log('socket_init_urls', { urlCount: allUrls.length, urls: allUrls });
    const io = await this.connectWithFallback(allUrls, username);
    console.log('socket_connected', { socketId: io.id, connected: io.connected });

    this.socket = io;
    this.setupSocketListeners(io);
    console.log('socket_listeners_setup');

    return io;
  }

  private setupSocketListeners(io: SocketInstance) {
    io.on('disconnect', () => { });

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
      const { offer, fromPeerId, fromUsername, meetingId } = data;

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
      const { answer, fromPeerId } = data;

      const transformedData = {
        from: fromPeerId,
        to: this.peerId,
        answer,
        meetingId: this.currentMeetingId,
      };

      this.onAnswerReceived?.(transformedData);
    });

    io.on('ice-candidate', (data: any) => {
      const { candidate, fromPeerId } = data;

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

    io.on('meeting-join-request', (data: JoinRequest & { meetingId: string }) => {
      this.onJoinRequest?.(data);
    });

    io.on('meeting-join-approved', (data: { meetingId: string; participants: User[] }) => {
      this.onJoinApproved?.(data);
    });

    io.on('meeting-join-denied', (data: { meetingId: string; reason?: string }) => {
      this.onJoinDenied?.(data);
    });

    io.on('direct-call-ended', (data: { endedBy: string; endedByName: string; meetingId?: string }) => {
      console.log('direct_call_ended_received', data);
      this.onDirectCallEnded?.(data);
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
      console.log('register_user_no_socket', { userId: userData.userId });
      throw new Error('Socket not initialized');
    }

    console.log('register_user_emit', {
      userId: userData.userId,
      username: userData.username,
      hasPhone: !!userData.phoneNumber,
      peerId: userData.peerId,
      socketConnected: this.socket.connected
    });
    this.socket.emit('register-user', userData);
    console.log('register_user_emitted');
  }

  updateFcmToken(userId: string, fcmToken: string, platform: 'ios' | 'android') {
    if (!this.socket) {
      console.log('fcm_update_no_socket');
      return;
    }
    this.socket.emit('update-fcm-token', { userId, fcmToken, platform });
    console.log('fcm_token_sent', platform);
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

  endDirectCall(data: { meetingId?: string; recipientUserId?: string }) {
    if (!this.socket) {
      console.log('end_direct_call_no_socket');
      return;
    }

    this.socket.emit('end-direct-call', data);
    console.log('end_direct_call_emitted', data);
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

    console.log('upload_key_bundle_emit', {
      userId: bundle.userId,
      hasIdentityKey: !!bundle.identityKey,
      hasEphemeralKey: !!bundle.ephemeralKey,
      socketConnected: this.socket.connected
    });
    this.socket.emit('upload-key-bundle', bundle);
    console.log('upload_key_bundle_emitted');
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

  respondToJoinRequest(meetingId: string, requestId: string, approve: boolean) {
    if (!this.socket) {
      throw new Error('Socket not initialized');
    }

    this.socket.emit('respond-join-request', {
      meetingId,
      requestId,
      approve,
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}
