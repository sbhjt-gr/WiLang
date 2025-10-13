import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { Text } from '@rneui/themed';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types/navigation';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { doc, getDoc } from 'firebase/firestore';
import { auth, firestore } from '../../config/firebase';

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

  useEffect(() => {
    performAccountChecks();
  }, []);

  const performAccountChecks = async (): Promise<void> => {
    try {
      const user = auth.currentUser;
      
      if (!user) {
        setTimeout(() => {
          navigation.replace('LoginScreen');
        }, 1000);
        return;
      }
      
      const userRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        setTimeout(() => {
          navigation.replace('PhoneNumberScreen', { from: fromScreen });
        }, 1000);
        return;
      }

      const userData = userDoc.data();
      const hasPhone = userData?.phone && userData.phone.trim().length > 0;

      if (!hasPhone) {
        setTimeout(() => {
          navigation.replace('PhoneNumberScreen', { from: fromScreen });
        }, 1000);
      } else {
        setTimeout(() => {
          navigation.replace('HomeScreen', { signedUp });
        }, 800);
      }
    } catch (error: any) {
      setTimeout(() => {
        navigation.replace('LoginScreen');
      }, 1500);
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
            <Image 
              source={require('../../../assets/wilang.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          
          <ActivityIndicator size="large" color="#ffffff" style={styles.loader} />
          
          <Text style={styles.statusText}>
            Just a moment...
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
  logo: {
    width: 80,
    height: 80,
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
