import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

class PushService {
  private fcmToken: string | null = null;
  private tokenListeners: Array<(token: string) => void> = [];

  async init(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('push_not_device');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('push_permission_denied');
      return null;
    }

    try {
      const tokenData = await Notifications.getDevicePushTokenAsync();
      this.fcmToken = tokenData.data;
      console.log('push_token_obtained', Platform.OS);
      
      this.tokenListeners.forEach(listener => {
        if (this.fcmToken) listener(this.fcmToken);
      });
      
      return this.fcmToken;
    } catch (err) {
      console.log('push_token_error', err);
      return null;
    }
  }

  async getToken(): Promise<string | null> {
    if (this.fcmToken) return this.fcmToken;
    return this.init();
  }

  onTokenRefresh(callback: (token: string) => void): () => void {
    this.tokenListeners.push(callback);
    
    if (this.fcmToken) {
      callback(this.fcmToken);
    }

    return () => {
      const index = this.tokenListeners.indexOf(callback);
      if (index > -1) {
        this.tokenListeners.splice(index, 1);
      }
    };
  }

  async setupNotificationChannel() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('calls', {
        name: 'Incoming Calls',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500],
        sound: 'default',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
      });
    }

    await Notifications.setNotificationCategoryAsync('incoming_call', [
      {
        identifier: 'answer',
        buttonTitle: 'Answer',
        options: {
          opensAppToForeground: true,
        },
      },
      {
        identifier: 'decline',
        buttonTitle: 'Decline',
        options: {
          opensAppToForeground: false,
          isDestructive: true,
        },
      },
    ]);
  }

  setupNotificationHandler() {
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const data = notification.request.content.data;
        
        if (data?.type === 'incoming_call') {
          return {
            shouldShowAlert: true,
            shouldPlaySound: false,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
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
  }

  addNotificationListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
  }

  addResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  async getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
    return Notifications.getLastNotificationResponseAsync();
  }
}

export const pushService = new PushService();
