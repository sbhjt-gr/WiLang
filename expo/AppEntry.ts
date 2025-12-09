import { registerRootComponent } from 'expo';
import { activateKeepAwakeAsync } from 'expo-keep-awake';
import * as Notifications from 'expo-notifications';
import messaging from '@react-native-firebase/messaging';
import RNCallKeep from 'react-native-callkeep';
import { Platform } from 'react-native';
import { callKeepService } from '../src/services/callkeep-service';
import { storeIncomingCall } from '../src/utils/call-storage';

import App from '../App';

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('fcm_background', remoteMessage.data?.type);

  const data = remoteMessage.data;
  if (data?.type === 'incoming_call') {
    try {
      const callData = {
        callId: String(data.callId || ''),
        callerName: String(data.callerName || 'Unknown'),
        callerPhone: data.callerPhone ? String(data.callerPhone) : undefined,
        callerId: data.callerId ? String(data.callerId) : undefined,
        callerSocketId: data.callerSocketId ? String(data.callerSocketId) : undefined,
        meetingId: data.meetingId ? String(data.meetingId) : undefined,
        meetingToken: data.meetingToken ? String(data.meetingToken) : undefined,
      };

      await storeIncomingCall(callData);
      await callKeepService.init();
      callKeepService.displayIncomingCall(callData);

      if (Platform.OS === 'android') {
        RNCallKeep.backToForeground();
      }
    } catch (err) {
      console.log('fcm_background_error', err);
    }
  }
});

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    try {
      const data = notification?.request?.content?.data;
      
      if (data?.type === 'incoming_call') {
        const initialized = await callKeepService.init();
        if (initialized) {
          callKeepService.displayIncomingCall({
            callId: String(data.callId || ''),
            callerName: String(data.callerName || 'Unknown'),
            callerPhone: data.callerPhone ? String(data.callerPhone) : undefined,
            callerId: data.callerId ? String(data.callerId) : undefined,
            callerSocketId: data.callerSocketId ? String(data.callerSocketId) : undefined,
            meetingId: data.meetingId ? String(data.meetingId) : undefined,
            meetingToken: data.meetingToken ? String(data.meetingToken) : undefined,
          });
        }
        
        return {
          shouldShowAlert: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: false,
          shouldShowList: false,
        };
      }

      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      };
    } catch {
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      };
    }
  },
});

if (__DEV__) {
  activateKeepAwakeAsync();
}

registerRootComponent(App); 