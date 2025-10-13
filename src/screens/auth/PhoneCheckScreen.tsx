import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from '@rneui/themed';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types/navigation';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { doc, getDoc } from 'firebase/firestore';
import { auth, firestore } from '../../config/firebase';

type PhoneCheckScreenNavigationProp = StackNavigationProp<RootStackParamList, 'PhoneCheckScreen'>;
type PhoneCheckScreenRouteProp = RouteProp<RootStackParamList, 'PhoneCheckScreen'>;

interface Props {
  navigation: PhoneCheckScreenNavigationProp;
  route: PhoneCheckScreenRouteProp;
}

export default function PhoneCheckScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const [statusMessage, setStatusMessage] = useState<string>('verifying_account');
  const fromScreen = route.params?.from || 'login';
  const signedUp = route.params?.signedUp || 0;

  useEffect(() => {
    checkPhoneNumber();
  }, []);

  const checkPhoneNumber = async (): Promise<void> => {
    try {
      const user = auth.currentUser;
      
      if (!user) {
        setStatusMessage('auth_check_failed');
        setTimeout(() => {
          navigation.replace('LoginScreen');
        }, 1500);
        return;
      }

      setStatusMessage('checking_profile');
      
      const userRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        setStatusMessage('profile_incomplete');
        setTimeout(() => {
          navigation.replace('PhoneNumberScreen', { from: fromScreen });
        }, 1000);
        return;
      }

      const userData = userDoc.data();
      const hasPhone = userData?.phone && userData.phone.trim().length > 0;

      if (!hasPhone) {
        setStatusMessage('phone_required');
        setTimeout(() => {
          navigation.replace('PhoneNumberScreen', { from: fromScreen });
        }, 1000);
      } else {
        setStatusMessage('profile_complete');
        setTimeout(() => {
          navigation.replace('HomeScreen', { signedUp });
        }, 800);
      }
    } catch (error: any) {
      setStatusMessage('verification_error');
      setTimeout(() => {
        navigation.replace('HomeScreen', { signedUp });
      }, 1500);
    }
  };

  const getStatusText = (): string => {
    switch (statusMessage) {
      case 'verifying_account':
        return 'Verifying your account';
      case 'checking_profile':
        return 'Checking profile';
      case 'profile_incomplete':
        return 'Setting up profile';
      case 'phone_required':
        return 'Additional info needed';
      case 'profile_complete':
        return 'All set';
      case 'auth_check_failed':
        return 'Authentication required';
      case 'verification_error':
        return 'Continuing';
      default:
        return 'Loading';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={colors.gradient1}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={[styles.floatingCircle, styles.circle1]} />
      <View style={[styles.floatingCircle, styles.circle2]} />
      <View style={[styles.floatingCircle, styles.circle3]} />
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Ionicons name="shield-checkmark" size={64} color="#ffffff" />
          </View>
          
          <ActivityIndicator size="large" color="#ffffff" style={styles.loader} />
          
          <Text style={styles.statusText}>
            {getStatusText()}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  floatingCircle: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 100,
  },
  circle1: {
    width: 200,
    height: 200,
    top: -100,
    right: -50,
  },
  circle2: {
    width: 150,
    height: 150,
    bottom: 100,
    left: -75,
  },
  circle3: {
    width: 100,
    height: 100,
    top: 200,
    left: 50,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    width: 120,
    height: 120,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  loader: {
    marginBottom: 24,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
});
