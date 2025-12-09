import { EventEmitter } from 'events';

export interface QRSession {
    sessionId: string;
    secret: string;
    expiresAt: number;
    hostSourceLang?: string;
    hostTargetLang?: string;
    peerSourceLang?: string;
    peerTargetLang?: string;
    status: 'waiting' | 'paired' | 'expired' | 'cancelled';
}

export interface QRPeerInfo {
    peerId: string;
    username: string;
    userId?: string;
    sourceLang: string;
    targetLang: string;
}

export interface QRPairingEvents {
    sessionCreated: (session: QRSession) => void;
    peerJoined: (peer: QRPeerInfo) => void;
    sessionExpired: () => void;
    sessionEnded: (data: { endedBy: string; reason?: string }) => void;
    error: (error: Error) => void;
}

class QRPairingService extends EventEmitter {
    private currentSession: QRSession | null = null;
    private socket: any = null;
    private expiryTimer: NodeJS.Timeout | null = null;

    setSocket(socket: any) {
        this.socket = socket;
        this.setupListeners();
    }

    private setupListeners() {
        if (!this.socket) return;

        this.socket.on('qr-session-created', (data: { sessionId: string; secret: string; expiresAt: number }) => {
            this.currentSession = {
                ...data,
                status: 'waiting',
            };
            this.emit('sessionCreated', this.currentSession);
            this.startExpiryTimer(data.expiresAt);
        });

        this.socket.on('qr-peer-joined', (peer: QRPeerInfo) => {
            if (this.currentSession) {
                this.currentSession.status = 'paired';
                this.currentSession.peerSourceLang = peer.sourceLang;
                this.currentSession.peerTargetLang = peer.targetLang;
            }
            this.emit('peerJoined', peer);
        });

        this.socket.on('qr-session-error', (error: { message: string }) => {
            this.emit('error', new Error(error.message));
        });

        this.socket.on('qr-session-expired', () => {
            if (this.currentSession) {
                this.currentSession.status = 'expired';
            }
            this.emit('sessionExpired');
            this.cleanup();
        });

        this.socket.on('qr-session-ended', (data: { endedBy: string; reason?: string }) => {
            this.emit('sessionEnded', data);
            this.cleanup();
        });
    }

    private startExpiryTimer(expiresAt: number) {
        this.clearExpiryTimer();
        const remaining = expiresAt - Date.now();
        if (remaining > 0) {
            this.expiryTimer = setTimeout(() => {
                if (this.currentSession && this.currentSession.status === 'waiting') {
                    this.currentSession.status = 'expired';
                    this.emit('sessionExpired');
                }
            }, remaining);
        }
    }

    private clearExpiryTimer() {
        if (this.expiryTimer) {
            clearTimeout(this.expiryTimer);
            this.expiryTimer = null;
        }
    }

    createSession(sourceLang: string, targetLang: string): Promise<QRSession> {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.socket.connected) {
                reject(new Error('Socket not connected'));
                return;
            }

            const timeout = setTimeout(() => {
                reject(new Error('Session creation timeout'));
            }, 10000);

            this.socket.emit('create-qr-session', { sourceLang, targetLang });

            const handler = (data: { sessionId: string; secret: string; expiresAt: number }) => {
                clearTimeout(timeout);
                const session: QRSession = {
                    ...data,
                    hostSourceLang: sourceLang,
                    hostTargetLang: targetLang,
                    status: 'waiting',
                };
                this.currentSession = session;
                this.startExpiryTimer(data.expiresAt);
                resolve(session);
            };

            this.socket.once('qr-session-created', handler);
        });
    }

    joinSession(sessionId: string, secret: string, sourceLang: string, targetLang: string): Promise<QRPeerInfo> {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.socket.connected) {
                reject(new Error('Socket not connected'));
                return;
            }

            const timeout = setTimeout(() => {
                reject(new Error('Join session timeout'));
            }, 10000);

            this.socket.emit('join-qr-session', { sessionId, secret, sourceLang, targetLang });

            this.socket.once('qr-join-success', (data: { host: QRPeerInfo; meetingId: string }) => {
                clearTimeout(timeout);
                resolve(data.host);
            });

            this.socket.once('qr-session-error', (error: { message: string }) => {
                clearTimeout(timeout);
                reject(new Error(error.message));
            });
        });
    }

    cancelSession() {
        if (this.socket && this.currentSession) {
            this.socket.emit('cancel-qr-session', { sessionId: this.currentSession.sessionId });
            this.currentSession.status = 'cancelled';
        }
        this.cleanup();
    }

    endSession(sessionId?: string) {
        const sid = sessionId || this.currentSession?.sessionId;
        if (this.socket && sid) {
            this.socket.emit('end-qr-session', { sessionId: sid });
        }
        this.cleanup();
    }

    setSessionId(sessionId: string) {
        if (!this.currentSession) {
            this.currentSession = {
                sessionId,
                secret: '',
                expiresAt: 0,
                status: 'paired',
            };
        } else {
            this.currentSession.sessionId = sessionId;
        }
    }

    getCurrentSession(): QRSession | null {
        return this.currentSession;
    }

    generateQRData(): string | null {
        if (!this.currentSession) return null;
        return JSON.stringify({
            s: this.currentSession.sessionId,
            k: this.currentSession.secret,
        });
    }

    parseQRData(data: string): { sessionId: string; secret: string } | null {
        try {
            const parsed = JSON.parse(data);
            if (parsed.s && parsed.k) {
                return { sessionId: parsed.s, secret: parsed.k };
            }
            return null;
        } catch {
            return null;
        }
    }

    cleanup() {
        this.clearExpiryTimer();
        this.currentSession = null;
    }
}

export const qrPairingService = new QRPairingService();
export default qrPairingService;
