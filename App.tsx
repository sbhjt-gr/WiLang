import React, { useEffect } from 'react';
import { registerGlobals } from '@livekit/react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import TabNavigator from './src/screens/TabNavigator';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import AccountLoadingScreen from './src/screens/auth/AccountLoadingScreen';
import { navigationRef, navigate } from './src/utils/navigationRef';
import PhoneNumberScreen from './src/screens/auth/PhoneNumberScreen';
import UsersScreen from './src/screens/UsersScreen';
import { initializeFirebase } from './src/services/FirebaseService';
import { initDatabase } from './src/utils/database';
import VideoCallScreen from './src/screens/VideoCallScreen';
import VoiceCallScreen from './src/screens/VoiceCallScreen';
import CallingScreen from './src/screens/CallingScreen';
import QRTranslationScreen from './src/screens/QRTranslationScreen';
import EnvironmentConfig from './src/screens/EnvironmentConfig';
import ThemeSettingsScreen from './src/screens/ThemeSettingsScreen';
import TranslationSettingsScreen from './src/screens/TranslationSettingsScreen';
import CallTranslationSettings from './src/screens/CallTranslationSettings';
import { RootStackParamList } from './src/types/navigation';
import WebRTCProvider from './src/store/WebRTCProvider';
import WebRTCInitializer from './src/components/WebRTCInitializer';
import { ThemeProvider } from './src/theme';
import { pushService } from './src/services/push-service';

registerGlobals();

const Stack = createNativeStackNavigator<RootStackParamList>();

const customTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#f8fafc',
  },
};

export default function App() {
  registerGlobals();

  useEffect(() => {
    const initApp = async () => {
      try {
        await initializeFirebase();
        console.log('firebase_initialized');
        await initDatabase();
        console.log('database_initialized');

        await pushService.setupNotificationChannel();
        pushService.setupNotificationHandler();

        const lastResponse = await pushService.getLastNotificationResponse();
        if (lastResponse) {
          const data = lastResponse.notification.request.content.data;
          if (data?.type === 'incoming_call') {
            setTimeout(() => {
              navigate('CallingScreen', {
                callType: 'incoming',
                callerName: String(data.callerName || 'Unknown'),
                callerPhone: data.callerPhone ? String(data.callerPhone) : undefined,
                callerId: data.callerId ? String(data.callerId) : undefined,
                callerSocketId: data.callerSocketId ? String(data.callerSocketId) : undefined,
                callId: data.callId ? String(data.callId) : undefined,
                meetingId: data.meetingId ? String(data.meetingId) : undefined,
                meetingToken: data.meetingToken ? String(data.meetingToken) : undefined,
                isVoiceOnly: data.callType === 'voice',
              });
            }, 1000);
          }
        }
      } catch (error) {
        console.error('app_init_error', error);
      }
    };

    initApp();

    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      const actionId = response.actionIdentifier;

      if (data?.type === 'incoming_call') {
        if (actionId === 'decline') {
          const { videoCallService } = require('./src/services/VideoCallService');
          videoCallService.declineIncomingCall(
            String(data.callId || ''),
            String(data.callerSocketId || '')
          );
          return;
        }

        navigate('CallingScreen', {
          callType: 'incoming',
          callerName: String(data.callerName || 'Unknown'),
          callerPhone: data.callerPhone ? String(data.callerPhone) : undefined,
          callerId: data.callerId ? String(data.callerId) : undefined,
          callerSocketId: data.callerSocketId ? String(data.callerSocketId) : undefined,
          callId: data.callId ? String(data.callId) : undefined,
          meetingId: data.meetingId ? String(data.meetingId) : undefined,
          meetingToken: data.meetingToken ? String(data.meetingToken) : undefined,
          isVoiceOnly: data.callType === 'voice',
        });
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <ThemeProvider>
      <WebRTCProvider>
        <WebRTCInitializer>
          <SafeAreaProvider>
            <NavigationContainer ref={navigationRef} theme={customTheme}>
              <StatusBar style="light" />
              <Stack.Navigator
                screenOptions={{
                  headerShown: false,
                  animation: 'slide_from_right'
                }}
                initialRouteName="AccountLoadingScreen"
              >
                <Stack.Screen
                  name="LoginScreen"
                  component={LoginScreen}
                />
                <Stack.Screen
                  name="RegisterScreen"
                  component={RegisterScreen}
                />
                <Stack.Screen
                  name="AccountLoadingScreen"
                  component={AccountLoadingScreen}
                />
                <Stack.Screen
                  name="PhoneNumberScreen"
                  component={PhoneNumberScreen}
                />
                <Stack.Screen
                  name="HomeScreen"
                  component={TabNavigator}
                />
                <Stack.Screen
                  name="UsersScreen"
                  component={UsersScreen}
                />
                <Stack.Screen
                  name="VideoCallScreen"
                  component={VideoCallScreen}
                />
                <Stack.Screen
                  name="VoiceCallScreen"
                  component={VoiceCallScreen}
                />
                <Stack.Screen
                  name="CallingScreen"
                  component={CallingScreen}
                  options={{
                    presentation: 'fullScreenModal',
                    animation: 'fade'
                  }}
                />
                <Stack.Screen
                  name="EnvironmentConfig"
                  component={EnvironmentConfig}
                />
                <Stack.Screen
                  name="ThemeSettingsScreen"
                  component={ThemeSettingsScreen}
                />
                <Stack.Screen
                  name="TranslationSettingsScreen"
                  component={TranslationSettingsScreen}
                />
                <Stack.Screen
                  name="CallTranslationSettings"
                  component={CallTranslationSettings}
                />
              </Stack.Navigator>
            </NavigationContainer>
          </SafeAreaProvider>
        </WebRTCInitializer>
      </WebRTCProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
});

