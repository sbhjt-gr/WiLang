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

  async startVideoCallWithPhone(userId: string, phone: string, name: string): Promise<void> {
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

      const currentUser = getCurrentUser();
      if (!currentUser) {
        Alert.alert('Error', 'User not authenticated.');
        return;
      }

      const socketManager = this.webRTCContext.socketManager?.current;
      if (!socketManager) {
        Alert.alert('Error', 'Socket not connected. Please try again.');
        return;
      }

      if (this.navigationRef?.current) {
        this.navigationRef.current.navigate('CallingScreen', {
          callType: 'outgoing',
          callerName: name,
          callerPhone: phone,
          callerId: userId
        });
      }

      const callData = {
        recipientUserId: userId,
        recipientPhone: phone,
        callerId: currentUser.uid,
        callerName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Unknown',
        callerPhone: currentUser.phoneNumber,
        callType: 'video'
      };

      const result = await socketManager.initiateCall(callData);
      
      if (!result.success) {
        if (this.navigationRef?.current) {
          this.navigationRef.current.goBack();
        }
        Alert.alert('Error', result.error === 'timeout' ? 'Call timed out. User may be offline.' : 'Failed to initiate call.');
      }

      console.log('call_initiated', result);
    } catch (_error) {
      if (this.navigationRef?.current) {
        this.navigationRef.current.goBack();
      }
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
      if (this.navigationRef?.current) {
        this.navigationRef.current.navigate('CallingScreen', {
          callType: 'incoming',
          callerName: caller.name || caller.username,
          callerPhone: caller.phoneNumbers?.[0]?.number,
          callerId: caller.id || caller.username
        });
      }
      resolve();
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

  acceptIncomingCall(callerId: string, meetingId?: string, meetingToken?: string) {
    const socketManager = this.webRTCContext?.socketManager?.current;
    if (!socketManager) {
      console.log('socket_error');
      return;
    }

    socketManager.acceptCall({
      callId: callerId,
      callerSocketId: callerId,
      meetingId,
      meetingToken
    });

    console.log('call_accepted', callerId, meetingId);
  }

  declineIncomingCall(callerId: string) {
    const socketManager = this.webRTCContext?.socketManager?.current;
    if (!socketManager) {
      console.log('socket_error', 'not_connected');
      return;
    }

    socketManager.declineCall({
      callId: callerId,
      callerSocketId: callerId
    });

    if (this.navigationRef?.current) {
      this.navigationRef.current.goBack();
    }

    console.log('call_declined', callerId);
  }

  cancelOutgoingCall() {
    const socketManager = this.webRTCContext?.socketManager?.current;
    if (!socketManager) {
      console.log('socket_error', 'not_connected');
      return;
    }

    socketManager.cancelCall({
      callId: 'temp',
      recipientSocketId: undefined
    });

    if (this.navigationRef?.current) {
      this.navigationRef.current.goBack();
    }

    console.log('call_cancelled');
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