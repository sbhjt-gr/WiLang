import React, { useEffect } from 'react';
import { registerGlobals } from '@livekit/react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TabNavigator from './src/screens/TabNavigator';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import AccountLoadingScreen from './src/screens/auth/AccountLoadingScreen';
import { navigationRef } from './src/utils/navigationRef';
import PhoneNumberScreen from './src/screens/auth/PhoneNumberScreen';
import UsersScreen from './src/screens/UsersScreen';
import { initializeFirebase } from './src/services/FirebaseService';
import { initDatabase } from './src/utils/database';
import VideoCallScreen from './src/screens/VideoCallScreen';
import CallingScreen from './src/screens/CallingScreen';
import EnvironmentConfig from './src/screens/EnvironmentConfig';
import ThemeSettingsScreen from './src/screens/ThemeSettingsScreen';
import TranslationSettingsScreen from './src/screens/TranslationSettingsScreen';
import { RootStackParamList } from './src/types/navigation';
import WebRTCProvider from './src/store/WebRTCProvider';
import WebRTCInitializer from './src/components/WebRTCInitializer';
import { ThemeProvider } from './src/theme';

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
      } catch (error) {
        console.error('app_init_error', error);
      }
    };
    
    initApp();
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

