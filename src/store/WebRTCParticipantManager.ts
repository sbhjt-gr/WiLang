import {User} from './WebRTCTypes';

export class WebRTCParticipantManager {
  private participants: User[] = [];
  private onParticipantsUpdated?: (participants: User[]) => void;
  private onPeerConnectionRequested?: (participant: User, isInitiator: boolean) => void;

  setCallbacks(callbacks: {
    onParticipantsUpdated?: (participants: User[]) => void;
    onPeerConnectionRequested?: (participant: User, isInitiator: boolean) => void;
  }) {
    this.onParticipantsUpdated = callbacks.onParticipantsUpdated;
    this.onPeerConnectionRequested = callbacks.onPeerConnectionRequested;
  }

  getParticipants(): User[] {
    return [...this.participants];
  }

  setParticipants(participants: User[]) {
    this.participants = [...participants];
    this.onParticipantsUpdated?.(this.participants);
  }

  addParticipant(user: User) {
    const existingIndex = this.participants.findIndex(p => p.peerId === user.peerId);
    if (existingIndex !== -1) {
      this.participants[existingIndex] = { ...this.participants[existingIndex], ...user };
    } else {
      const duplicateByName = this.participants.find(p => 
        p.username.trim() === user.username.trim() && p.peerId !== user.peerId
      );
      
      if (duplicateByName) {
        const oldIndex = this.participants.findIndex(p => p.peerId === duplicateByName.peerId);
        if (oldIndex !== -1) {
          this.participants.splice(oldIndex, 1);
        }
      }
      this.participants.push(user);
    }
    this.onParticipantsUpdated?.(this.participants);
  }

  removeParticipant(peerId: string) {
    const participantIndex = this.participants.findIndex(p => p.peerId === peerId);
    if (participantIndex !== -1) {
      const removedParticipant = this.participants[participantIndex];
      this.participants.splice(participantIndex, 1);
      this.onParticipantsUpdated?.(this.participants);
      return removedParticipant;
    } else {
      return null;
    }
  }

  updateParticipant(peerId: string, updates: Partial<User>) {
    const participantIndex = this.participants.findIndex(p => p.peerId === peerId);
    if (participantIndex !== -1) {
      this.participants[participantIndex] = { 
        ...this.participants[participantIndex], 
        ...updates 
      };
      this.onParticipantsUpdated?.(this.participants);
      return this.participants[participantIndex];
    } else {
      return null;
    }
  }

  findParticipant(peerId: string): User | null {
    return this.participants.find(p => p.peerId === peerId) || null;
  }

  createPeerConnectionsWithExistingParticipants(serverParticipants: User[], currentSocketId: string) {
    const otherParticipants = serverParticipants.filter(p => p.peerId !== currentSocketId);
    this.setParticipants(otherParticipants);
    otherParticipants.forEach(participant => {
      const shouldInitiate = currentSocketId > participant.peerId;
      this.onPeerConnectionRequested?.(participant, shouldInitiate);
    });
  }

  handleUserJoined(user: User, currentPeerId: string) {
    this.addParticipant(user);
    if (user.peerId !== currentPeerId) {
      const shouldInitiate = currentPeerId > user.peerId;
      this.onPeerConnectionRequested?.(user, shouldInitiate);
    }
  }

  handleUserLeft(user: User) {
    this.removeParticipant(user.peerId);
  }

  clearParticipants() {
    this.participants = [];
    this.onParticipantsUpdated?.(this.participants);
  }

  reset() {
    this.clearParticipants();
  }
}
