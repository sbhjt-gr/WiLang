import { Alert } from 'react-native';
import { getCurrentUser } from './FirebaseService';
import { User } from '../store/WebRTCTypes';

interface Contact {
  id: string;
  name: string;
  phoneNumbers?: { number?: string; }[];
  emails?: { email?: string; }[];
}

export class VideoCallService {
  private static instance: VideoCallService;
  private webRTCContext: any = null;
  private navigationRef: any = null;

  static getInstance(): VideoCallService {
    if (!VideoCallService.instance) {
      VideoCallService.instance = new VideoCallService();
    }
    return VideoCallService.instance;
  }

  setWebRTCContext(context: any) {
    this.webRTCContext = context;
  }

  setNavigationRef(navigationRef: any) {
    this.navigationRef = navigationRef;
  }

  async initializeVideoCall(): Promise<boolean> {
    try {
      if (!this.webRTCContext) {
        return false;
      }

      const user = getCurrentUser();
      const username = user?.displayName || user?.email?.split('@')[0] || `user_${Date.now()}`;
      
      await this.webRTCContext.initialize(username);
      return true;
    } catch (_error) {
      return false;
    }
  }

  convertContactToUser(contact: Contact): User {
    return {
      username: contact.name,
      peerId: '', 
      id: contact.id,
      name: contact.name,
      phoneNumbers: contact.phoneNumbers,
    };
  }

  async startVideoCall(contact: Contact): Promise<void> {
    try {
      if (!this.webRTCContext) {
        Alert.alert('Error', 'Video calling is not initialized. Please try again.');
        return;
      }

      if (!this.webRTCContext.localStream) {
        const initialized = await this.initializeVideoCall();
        if (!initialized) {
          Alert.alert('Error', 'Failed to initialize camera and microphone.');
          return;
        }
      }

      Alert.alert(
        'Video Call',
        `Starting video call with ${contact.name}...`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start Call',
            onPress: () => this.startMockCall(contact)
          }
        ]
      );
    } catch (_error) {
      Alert.alert('Error', 'Failed to start video call. Please try again.');
    }
  }

  private startMockCall(contact: Contact) {
    try {
      const mockUser = this.convertContactToUser(contact);
      mockUser.peerId = `mock_${contact.id}_${Date.now()}`;

      if (this.webRTCContext.setRemoteUser) {
        this.navigateToCallScreen(contact);
      }
    } catch (_error) {
    }
  }

  private navigateToCallScreen(contact: Contact) {
    if (this.navigationRef?.current) {
      this.navigationRef.current.navigate('VideoCallScreen', {
        id: `call_${contact.id}`,
        type: 'outgoing',
        contact: contact
      });
    }
  }

  async handleIncomingCall(caller: User): Promise<void> {
    return new Promise((resolve) => {
      Alert.alert(
        'Incoming Call',
        `${caller.name || caller.username} is calling...`,
        [
          {
            text: 'Decline',
            style: 'destructive',
            onPress: () => {
              this.declineCall(caller);
              resolve();
            }
          },
          {
            text: 'Accept',
            onPress: () => {
              this.acceptCall(caller);
              resolve();
            }
          }
        ],
        { cancelable: false }
      );
    });
  }

  private acceptCall(caller: User) {
    try {
      if (this.webRTCContext) {
        if (this.navigationRef?.current) {
          this.navigationRef.current.navigate('VideoCallScreen', {
            id: `call_${caller.id || caller.username}`,
            type: 'incoming',
            caller: caller
          });
        }
      }
    } catch (_error) {
    }
  }

  private declineCall(_caller: User) {
  }

  endCall() {
    if (this.webRTCContext) {
      this.webRTCContext.closeCall();
    }

    if (this.navigationRef?.current) {
      this.navigationRef.current.goBack();
    }
  }

  isVideoCallAvailable(): boolean {
    return this.webRTCContext && this.webRTCContext.localStream !== null;
  }

  getCallStatus() {
    if (!this.webRTCContext) return 'unavailable';
    
    if (this.webRTCContext.activeCall) return 'active';
    if (this.webRTCContext.remoteUser) return 'connecting';
    if (this.webRTCContext.localStream) return 'ready';
    
    return 'initializing';
  }
}

export const videoCallService = VideoCallService.getInstance();