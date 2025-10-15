import {User} from './WebRTCTypes';
import {WebRTCParticipantManager} from './WebRTCParticipantManager';

export class WebRTCMeetingManager {
  private currentMeetingId: string | null = null;
  private username: string = '';
  private peerId: string = '';
  private participantManager: WebRTCParticipantManager;

  private onMeetingCreated?: (meetingId: string) => void;
  private onMeetingJoined?: (meetingId: string, participants: User[]) => void;

  constructor() {
    this.participantManager = new WebRTCParticipantManager();
  }

  setCallbacks(callbacks: {
    onMeetingCreated?: (meetingId: string) => void;
    onMeetingJoined?: (meetingId: string, participants: User[]) => void;
    onParticipantsUpdated?: (participants: User[]) => void;
    onPeerConnectionRequested?: (participant: User, isInitiator: boolean) => void;
  }) {
    this.onMeetingCreated = callbacks.onMeetingCreated;
    this.onMeetingJoined = callbacks.onMeetingJoined;

    this.participantManager.setCallbacks({
      onParticipantsUpdated: callbacks.onParticipantsUpdated,
      onPeerConnectionRequested: callbacks.onPeerConnectionRequested,
    });
  }

  setUsername(username: string) {
    this.username = username;
  }

  setPeerId(peerId: string) {
    this.peerId = peerId;
  }

  getCurrentMeetingId(): string | null {
    return this.currentMeetingId;
  }

  getParticipants(): User[] {
    return this.participantManager.getParticipants();
  }

  async createMeeting(socket: any): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!socket) {
        reject('Socket not connected');
        return;
      }

      if (!socket.connected) {
        reject('Socket not connected');
        return;
      }
      
      const timeoutId = setTimeout(() => {
        reject('Create meeting timeout');
      }, 10000);

      socket.emit('create-meeting', { username: this.username }, (response: any) => {
        clearTimeout(timeoutId);
        if (response && response.meetingId) {
          const meetingId = response.meetingId;
          this.currentMeetingId = meetingId;
          this.onMeetingCreated?.(meetingId);
          resolve(meetingId);
        } else {
          reject(response?.error || 'Failed to create meeting');
        }
      });
    });
  }

  async joinMeeting(
    meetingId: string, 
    socket: any, 
    meetingToken?: string, 
    userId?: string
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!socket?.connected) {
        reject('Socket not connected');
        return;
      }
      
      const timeoutId = setTimeout(() => {
        reject('Join meeting timeout');
      }, 10000);

      const joinData: any = { 
        meetingId, 
        username: this.username,
        peerId: socket.id 
      };
      
      if (meetingToken) {
        joinData.meetingToken = meetingToken;
      }
      
      if (userId) {
        joinData.userId = userId;
      }

      socket.emit('join-meeting', joinData, (response: any) => {
        clearTimeout(timeoutId);
        if (response && response.success) {
          this.currentMeetingId = meetingId;
          const participants = Array.isArray(response.participants) ? response.participants : [];

          this.onMeetingJoined?.(meetingId, participants);

          if (participants.length > 0) {
            this.participantManager.createPeerConnectionsWithExistingParticipants(
              participants,
              socket.id
            );
          }
          
          resolve(true);
        } else {
          reject(response?.error || 'Failed to join meeting');
        }
      });
    });
  }

  handleUserJoined(user: User) {
    this.participantManager.handleUserJoined(user, this.peerId);
  }

  handleUserLeft(user: User) {
    this.participantManager.handleUserLeft(user);
  }

  leaveMeeting(socket: any) {
    if (this.currentMeetingId && socket) {
      socket.emit('leave-meeting', { meetingId: this.currentMeetingId });
    }
    
    this.currentMeetingId = null;
    this.participantManager.clearParticipants();
  }

  updateParticipant(peerId: string, updates: Partial<User>) {
    return this.participantManager.updateParticipant(peerId, updates);
  }

  reset() {
    this.currentMeetingId = null;
    this.username = '';
    this.peerId = '';
    this.participantManager.reset();
  }
}
