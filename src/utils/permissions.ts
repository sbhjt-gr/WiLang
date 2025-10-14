import { Platform, Alert, Linking } from 'react-native';

export const requestOverlayPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const canDrawOverlays = await checkOverlayPermission();
    
    if (canDrawOverlays) {
      return true;
    }

    Alert.alert(
      'Overlay Permission Required',
      'WiLang needs permission to display incoming calls on top of other apps.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {}
        },
        {
          text: 'Grant Permission',
          onPress: () => {
            Linking.openSettings();
          }
        }
      ]
    );

    return false;
  } catch {
    return true;
  }
};

export const checkOverlayPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    return true;
  } catch {
    return false;
  }
};
