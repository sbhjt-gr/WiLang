import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TabNavigator from './src/screens/TabNavigator';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import UsersScreen from './src/screens/UsersScreen';
import { initializeFirebase } from './src/services/FirebaseService';
import VideoCallScreen from './src/screens/VideoCallScreen';
import EnvironmentConfig from './src/screens/EnvironmentConfig';
import ModelSettingsScreen from './src/screens/settings/ModelSettingsScreen';
import { RootStackParamList } from './src/types/navigation';
import WebRTCProvider from './src/store/WebRTCProvider';
import WebRTCInitializer from './src/components/WebRTCInitializer';

const Stack = createNativeStackNavigator<RootStackParamList>();

const customTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#f8fafc',
  },
};

export default function App() {
  useEffect(() => {
    const initApp = async () => {
      try {
        await initializeFirebase();
        console.log('Firebase initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Firebase:', error);
      }
    };
    
    initApp();
  }, []);

  return (
    <WebRTCProvider>
      <WebRTCInitializer>
        <SafeAreaProvider>
          <NavigationContainer theme={customTheme}>
            <StatusBar style="dark" />
            <Stack.Navigator 
              screenOptions={{ 
                headerShown: false,
                animation: 'slide_from_right'
              }} 
              initialRouteName="LoginScreen"
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
                name="EnvironmentConfig"
                component={EnvironmentConfig}
              />
              <Stack.Screen
                name="ModelSettings"
                component={ModelSettingsScreen}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </WebRTCInitializer>
    </WebRTCProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
});

