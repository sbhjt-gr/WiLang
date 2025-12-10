import { Platform } from 'react-native';
import RNCallKeep from 'react-native-callkeep';
import { navigate } from '../utils/navigationRef';

interface CallData {
  callId: string;
  callerName: string;
  callerPhone?: string;
  callerId?: string;
  callerSocketId?: string;
  meetingId?: string;
  meetingToken?: string;
}

class CallKeepService {
  private initialized = false;
  private activeCallId: string | null = null;
  private pendingCallData: CallData | null = null;
  private answerCallback: ((callData: CallData) => void) | null = null;
  private endCallback: ((callId: string) => void) | null = null;

  async init(): Promise<boolean> {
    if (this.initialized) return true;

    const options = {
      ios: {
        appName: 'WiLang',
        supportsVideo: true,
        maximumCallGroups: '1',
        maximumCallsPerCallGroup: '1',
      },
      android: {
        alertTitle: 'Permissions Required',
        alertDescription: 'WiLang needs access to display incoming calls',
        cancelButton: 'Cancel',
        okButton: 'OK',
        additionalPermissions: [],
        selfManaged: true,
        foregroundService: {
          channelId: 'wilang_calls',
          channelName: 'WiLang Calls',
          notificationTitle: 'WiLang Call',
          notificationIcon: 'ic_notification',
        },
      },
    };

    try {
      await RNCallKeep.setup(options);
      if (Platform.OS === 'android') {
        RNCallKeep.setAvailable(true);
      }
      this.initialized = true;
      this.setupListeners();
      console.log('callkeep_initialized');
      return true;
    } catch (err) {
      console.log('callkeep_init_failed', err);
      return false;
    }
  }

  private setupListeners() {
    RNCallKeep.addEventListener('answerCall', this.onAnswerCall.bind(this));
    RNCallKeep.addEventListener('endCall', this.onEndCall.bind(this));
    RNCallKeep.addEventListener('didDisplayIncomingCall', this.onDisplayCall.bind(this));
    RNCallKeep.addEventListener('didPerformSetMutedCallAction', this.onMuteCall.bind(this));
    
    if (Platform.OS === 'ios') {
      RNCallKeep.addEventListener('didLoadWithEvents', this.onDidLoadWithEvents.bind(this));
    }
  }

  private onDidLoadWithEvents(events: any[]) {
    if (!events || events.length === 0) return;
    
    for (const event of events) {
      if (event.name === 'RNCallKeepDidDisplayIncomingCall') {
        const { payload } = event.data || {};
        if (payload) {
          this.pendingCallData = {
            callId: payload.callId || event.data.callUUID,
            callerName: payload.callerName || event.data.localizedCallerName || 'Unknown',
            callerPhone: payload.callerPhone,
            callerId: payload.callerId,
            callerSocketId: payload.callerSocketId,
            meetingId: payload.meetingId,
            meetingToken: payload.meetingToken,
          };
        }
      }
    }
  }

  private onAnswerCall({ callUUID }: { callUUID: string }) {
    console.log('callkeep_answered', callUUID);
    
    if (Platform.OS === 'android') {
      RNCallKeep.backToForeground();
    }
    
    if (this.pendingCallData && this.answerCallback) {
      this.answerCallback(this.pendingCallData);
    } else if (this.pendingCallData) {
      navigate('CallingScreen', {
        callType: 'incoming',
        callerName: this.pendingCallData.callerName,
        callerPhone: this.pendingCallData.callerPhone,
        callerId: this.pendingCallData.callerId,
        callerSocketId: this.pendingCallData.callerSocketId,
        callId: this.pendingCallData.callId,
        meetingId: this.pendingCallData.meetingId,
        meetingToken: this.pendingCallData.meetingToken,
        fromPush: true,
      });
    }

    RNCallKeep.endCall(callUUID);
    this.activeCallId = null;
    this.pendingCallData = null;
  }

  private onEndCall({ callUUID }: { callUUID: string }) {
    console.log('callkeep_ended', callUUID);
    
    if (this.endCallback && this.activeCallId) {
      this.endCallback(this.activeCallId);
    }

    this.activeCallId = null;
    this.pendingCallData = null;
  }

  private onDisplayCall({ callUUID, handle, localizedCallerName, payload }: any) {
    console.log('callkeep_displayed', { callUUID, handle, localizedCallerName });
    
    if (payload && Platform.OS === 'ios') {
      this.pendingCallData = {
        callId: payload.callId || callUUID,
        callerName: payload.callerName || localizedCallerName || 'Unknown',
        callerPhone: payload.callerPhone,
        callerId: payload.callerId,
        callerSocketId: payload.callerSocketId,
        meetingId: payload.meetingId,
        meetingToken: payload.meetingToken,
      };
    }
  }

  private onMuteCall({ muted, callUUID }: { muted: boolean; callUUID: string }) {
    console.log('callkeep_mute', { muted, callUUID });
  }

  displayIncomingCall(callData: CallData) {
    if (!this.initialized) {
      console.log('callkeep_not_initialized');
      return;
    }

    this.activeCallId = callData.callId;
    this.pendingCallData = callData;

    RNCallKeep.displayIncomingCall(
      callData.callId,
      callData.callerPhone || callData.callerName,
      callData.callerName,
      'generic',
      true
    );

    console.log('callkeep_display_call', callData.callId);
  }

  endCall(callId?: string) {
    const id = callId || this.activeCallId;
    if (id) {
      RNCallKeep.endCall(id);
      this.activeCallId = null;
      this.pendingCallData = null;
    }
  }

  endAllCalls() {
    RNCallKeep.endAllCalls();
    this.activeCallId = null;
    this.pendingCallData = null;
  }

  setOnAnswerCall(callback: (callData: CallData) => void) {
    this.answerCallback = callback;
  }

  setOnEndCall(callback: (callId: string) => void) {
    this.endCallback = callback;
  }

  reportConnected(callId: string) {
    if (Platform.OS === 'ios') {
      RNCallKeep.reportConnectedOutgoingCallWithUUID(callId);
    }
  }

  cleanup() {
    RNCallKeep.removeEventListener('answerCall');
    RNCallKeep.removeEventListener('endCall');
    RNCallKeep.removeEventListener('didDisplayIncomingCall');
    RNCallKeep.removeEventListener('didPerformSetMutedCallAction');
    if (Platform.OS === 'ios') {
      RNCallKeep.removeEventListener('didLoadWithEvents');
    }
    this.initialized = false;
  }
}

export const callKeepService = new CallKeepService();
