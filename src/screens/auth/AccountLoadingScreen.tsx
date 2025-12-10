import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Image, Text } from 'react-native';
import { MotiView } from 'moti';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types/navigation';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../../config/firebase';
import { waitForAuthReady } from '../../services/FirebaseService';
import { User } from 'firebase/auth';

type AccountLoadingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AccountLoadingScreen'>;
type AccountLoadingScreenRouteProp = RouteProp<RootStackParamList, 'AccountLoadingScreen'>;

interface Props {
  navigation: AccountLoadingScreenNavigationProp;
  route: AccountLoadingScreenRouteProp;
}

export default function AccountLoadingScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const fromScreen = route.params?.from || 'app_launch';
  const signedUp = route.params?.signedUp || 0;
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const user = await waitForAuthReady();
        if (!active) {
          return;
        }
        await performAccountChecks(user);
      } catch {
        if (!active) {
          return;
        }
        scheduleNavigation(() => navigation.replace('LoginScreen'), 1500);
      }
    };

    init();

    return () => {
      active = false;
      timeouts.current.forEach(clearTimeout);
      timeouts.current = [];
    };
  }, [navigation, fromScreen, signedUp]);

  const scheduleNavigation = (action: () => void, delay: number) => {
    const timeoutId = setTimeout(action, delay);
    timeouts.current.push(timeoutId);
  };

  const performAccountChecks = async (user: User | null): Promise<void> => {
    try {
      if (!user) {
        scheduleNavigation(() => navigation.replace('LoginScreen'), 1000);
        return;
      }

      const userRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        scheduleNavigation(() => navigation.replace('PhoneNumberScreen', { from: fromScreen }), 1000);
        return;
      }

      const userData = userDoc.data();
      const hasPhone = typeof userData?.phone === 'string' && userData.phone.trim().length > 0;

      if (!hasPhone) {
        scheduleNavigation(() => navigation.replace('PhoneNumberScreen', { from: fromScreen }), 1000);
        return;
      }

      scheduleNavigation(() => navigation.replace('HomeScreen', { signedUp }), 800);
    } catch {
      scheduleNavigation(() => navigation.replace('LoginScreen'), 1500);
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
        <MotiView
          from={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            type: 'spring',
            damping: 20,
            stiffness: 100,
          }}
          style={styles.content}
        >
          <MotiView
            from={{ scale: 1 }}
            animate={{ scale: 1.1 }}
            transition={{
              type: 'timing',
              duration: 1000,
              loop: true,
              repeatReverse: true,
            }}
            style={styles.logoContainer}
          >
            <View style={styles.logoGlow} />
            <Image
              source={require('../../../assets/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </MotiView>

          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#ffffff" />
          </View>

          <Text style={styles.statusText}>
            Loading your account
          </Text>
          <Text style={styles.statusSubtext}>
            This will only take a moment
          </Text>
        </MotiView>
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 1000,
  },
  circle1: {
    width: 300,
    height: 300,
    top: -150,
    right: -100,
  },
  circle2: {
    width: 250,
    height: 250,
    bottom: -50,
    left: -125,
  },
  circle3: {
    width: 180,
    height: 180,
    top: 250,
    left: 30,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    width: 140,
    height: 140,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  logoGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 75,
  },
  loaderContainer: {
    marginBottom: 32,
    transform: [{ scale: 1.2 }],
  },
  statusText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  statusSubtext: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
