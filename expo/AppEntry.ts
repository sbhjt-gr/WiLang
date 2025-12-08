import { registerRootComponent } from 'expo';
import { activateKeepAwakeAsync } from 'expo-keep-awake';
import * as Notifications from 'expo-notifications';
import { callKeepService } from '../src/services/callkeep-service';

import App from '../App';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;
    
    if (data?.type === 'incoming_call') {
      callKeepService.init().then(() => {
        callKeepService.displayIncomingCall({
          callId: String(data.callId || ''),
          callerName: String(data.callerName || 'Unknown'),
          callerPhone: data.callerPhone ? String(data.callerPhone) : undefined,
          callerId: data.callerId ? String(data.callerId) : undefined,
          callerSocketId: data.callerSocketId ? String(data.callerSocketId) : undefined,
          meetingId: data.meetingId ? String(data.meetingId) : undefined,
          meetingToken: data.meetingToken ? String(data.meetingToken) : undefined,
        });
      });
      
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
  },
});

if (__DEV__) {
  activateKeepAwakeAsync();
}

registerRootComponent(App); 