import socketio from 'socket.io-client';
import {User} from './WebRTCTypes';
import {SERVER_URL, SERVER_URLS, WEBRTC_CONFIG} from './WebRTCConfig';

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

  setCallbacks(callbacks: {
    onUserJoined?: (user: User) => void;
    onUserLeft?: (user: User) => void;
    onOfferReceived?: (data: any) => void;
    onAnswerReceived?: (data: any) => void;
    onIceCandidateReceived?: (data: any) => void;
    onMeetingEnded?: () => void;
    onUsersChange?: (users: User[]) => void;
  }) {
    this.onUserJoined = callbacks.onUserJoined;
    this.onUserLeft = callbacks.onUserLeft;
    this.onOfferReceived = callbacks.onOfferReceived;
    this.onAnswerReceived = callbacks.onAnswerReceived;
    this.onIceCandidateReceived = callbacks.onIceCandidateReceived;
    this.onMeetingEnded = callbacks.onMeetingEnded;
    this.onUsersChange = callbacks.onUsersChange;
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

  getMeetingId(): string | null {
    return this.currentMeetingId;
  }

  getPeerId(): string {
    return this.peerId;
  }

  getSocket(): SocketInstance | null {
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}
