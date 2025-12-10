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
  private pendingCall: { callId: string; recipientPhone: string; recipientUserId: string } | null = null;

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
        Alert.alert('Unable to Call', 'Something went wrong. Please restart the app and try again.');
        return;
      }

      if (!this.webRTCContext.localStream) {
        const initialized = await this.initializeVideoCall();
        if (!initialized) {
          Alert.alert('Camera Access Required', 'Please allow camera and microphone access to make video calls.');
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
      Alert.alert('Call Failed', 'Unable to start the call right now. Please try again.');
    }
  }

  async startVideoCallWithPhone(userId: string, phone: string, name: string): Promise<void> {
    try {
      if (!this.webRTCContext) {
        Alert.alert('Unable to Call', 'Something went wrong. Please restart the app and try again.');
        return;
      }

      if (!this.webRTCContext.localStream) {
        const initialized = await this.initializeVideoCall();
        if (!initialized) {
          Alert.alert('Camera Access Required', 'Please allow camera and microphone access to make video calls.');
          return;
        }
      }

      const currentUser = getCurrentUser();
      if (!currentUser) {
        Alert.alert('Sign In Required', 'Please sign in to make calls.');
        return;
      }

      const socketManager = this.webRTCContext.socketManager?.current;
      if (!socketManager) {
        Alert.alert('Connection Issue', 'Unable to connect. Please check your internet and try again.');
        return;
      }

      if (this.navigationRef?.current) {
        this.navigationRef.current.reset({
          index: 0,
          routes: [{
            name: 'CallingScreen', params: {
              callType: 'outgoing',
              callerName: name,
              callerPhone: phone,
              callerId: userId
            }
          }],
        });
      }

      const callId = `call_${Date.now()}`;

      this.pendingCall = {
        callId,
        recipientPhone: phone,
        recipientUserId: userId
      };

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
        this.pendingCall = null;
        if (this.navigationRef?.current) {
          this.navigationRef.current.reset({ index: 0, routes: [{ name: 'HomeScreen' }] });
        }
        Alert.alert('Call Failed', result.error === 'timeout' ? 'No answer. The person may be busy or offline.' : 'Unable to reach this person right now.');
      }

      console.log('call_initiated', result);
    } catch (_error) {
      this.pendingCall = null;
      if (this.navigationRef?.current) {
        this.navigationRef.current.reset({ index: 0, routes: [{ name: 'HomeScreen' }] });
      }
      Alert.alert('Call Failed', 'Unable to start the call right now. Please try again.');
    }
  }

  async startVoiceCallWithPhone(userId: string, phone: string, name: string): Promise<void> {
    try {
      if (!this.webRTCContext) {
        Alert.alert('Unable to Call', 'Something went wrong. Please restart the app and try again.');
        return;
      }

      if (!this.webRTCContext.localStream) {
        const initialized = await this.initializeVideoCall();
        if (!initialized) {
          Alert.alert('Microphone Access Required', 'Please allow microphone access to make voice calls.');
          return;
        }
      }

      const currentUser = getCurrentUser();
      if (!currentUser) {
        Alert.alert('Sign In Required', 'Please sign in to make calls.');
        return;
      }

      const socketManager = this.webRTCContext.socketManager?.current;
      if (!socketManager) {
        Alert.alert('Connection Issue', 'Unable to connect. Please check your internet and try again.');
        return;
      }

      if (this.navigationRef?.current) {
        this.navigationRef.current.reset({
          index: 0,
          routes: [{
            name: 'CallingScreen', params: {
              callType: 'outgoing',
              callerName: name,
              callerPhone: phone,
              callerId: userId,
              isVoiceOnly: true
            }
          }],
        });
      }

      const callId = `call_${Date.now()}`;

      this.pendingCall = {
        callId,
        recipientPhone: phone,
        recipientUserId: userId
      };

      const callData = {
        recipientUserId: userId,
        recipientPhone: phone,
        callerId: currentUser.uid,
        callerName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Unknown',
        callerPhone: currentUser.phoneNumber,
        callType: 'voice'
      };

      const result = await socketManager.initiateCall(callData);

      if (!result.success) {
        this.pendingCall = null;
        if (this.navigationRef?.current) {
          this.navigationRef.current.reset({ index: 0, routes: [{ name: 'HomeScreen' }] });
        }
        Alert.alert('Call Failed', result.error === 'timeout' ? 'No answer. The person may be busy or offline.' : 'Unable to reach this person right now.');
      }

      console.log('voice_call_initiated', result);
    } catch (_error) {
      this.pendingCall = null;
      if (this.navigationRef?.current) {
        this.navigationRef.current.reset({ index: 0, routes: [{ name: 'HomeScreen' }] });
      }
      Alert.alert('Call Failed', 'Unable to start the call right now. Please try again.');
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
      this.navigationRef.current.reset({
        index: 0,
        routes: [{
          name: 'VideoCallScreen', params: {
            id: `call_${contact.id}`,
            type: 'outgoing',
            contact: contact
          }
        }],
      });
    }
  }

  async handleIncomingCall(caller: User): Promise<void> {
    return new Promise((resolve) => {
      if (this.navigationRef?.current) {
        this.navigationRef.current.reset({
          index: 0,
          routes: [{
            name: 'CallingScreen', params: {
              callType: 'incoming',
              callerName: caller.name || caller.username,
              callerPhone: caller.phoneNumbers?.[0]?.number,
              callerId: caller.id || caller.username
            }
          }],
        });
      }
      resolve();
    });
  }

  private acceptCall(caller: User) {
    try {
      if (this.webRTCContext) {
        if (this.navigationRef?.current) {
          this.navigationRef.current.reset({
            index: 0,
            routes: [{
              name: 'VideoCallScreen', params: {
                id: `call_${caller.id || caller.username}`,
                type: 'incoming',
                caller: caller
              }
            }],
          });
        }
      }
    } catch (_error) {
    }
  }

  private declineCall(_caller: User) {
  }

  acceptIncomingCall(callId: string, callerSocketId?: string, meetingId?: string, meetingToken?: string) {
    const socketManager = this.webRTCContext?.socketManager?.current;
    if (!socketManager) {
      console.log('socket_error');
      return;
    }

    if (!callerSocketId) {
      console.log('missing_caller_socket');
      return;
    }

    socketManager.acceptCall({
      callId,
      callerSocketId,
      meetingId,
      meetingToken
    });

    console.log('call_accepted', callId, meetingId);
  }

  declineIncomingCall(callId: string, callerSocketId?: string) {
    const socketManager = this.webRTCContext?.socketManager?.current;
    if (!socketManager) {
      console.log('socket_error', 'not_connected');
      return;
    }

    if (!callerSocketId) {
      console.log('missing_caller_socket');
      return;
    }

    socketManager.declineCall({
      callId,
      callerSocketId
    });

    if (this.navigationRef?.current) {
      this.navigationRef.current.reset({ index: 0, routes: [{ name: 'HomeScreen' }] });
    }

    console.log('call_declined', callId);
  }

  cancelOutgoingCall() {
    const socketManager = this.webRTCContext?.socketManager?.current;
    if (!socketManager) {
      console.log('socket_error', 'not_connected');
      return;
    }

    if (!this.pendingCall) {
      console.log('no_pending_call');
      if (this.navigationRef?.current) {
        this.navigationRef.current.reset({ index: 0, routes: [{ name: 'HomeScreen' }] });
      }
      return;
    }

    socketManager.cancelCall({
      callId: this.pendingCall.callId,
      recipientPhone: this.pendingCall.recipientPhone
    });

    this.pendingCall = null;

    if (this.navigationRef?.current) {
      this.navigationRef.current.reset({ index: 0, routes: [{ name: 'HomeScreen' }] });
    }

    console.log('call_cancelled');
  }

  clearPendingCall() {
    this.pendingCall = null;
  }

  endCall() {
    this.pendingCall = null;
    if (this.webRTCContext) {
      this.webRTCContext.closeCall();
    }

    if (this.navigationRef?.current) {
      this.navigationRef.current.reset({ index: 0, routes: [{ name: 'HomeScreen' }] });
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