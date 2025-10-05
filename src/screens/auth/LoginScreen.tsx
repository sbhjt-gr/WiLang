import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Text } from '@rneui/themed';
import { StackNavigationProp } from '@react-navigation/stack';
import { loginWithEmail, initializeFirebase, signInWithGoogle, onAuthStateChange } from '../../services/FirebaseService';
import { RootStackParamList } from '../../types/navigation';
import { SafeAreaView } from 'react-native-safe-area-context';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'LoginScreen'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    const initAuth = async () => {
      try {
        setIsLoading(true);
        await initializeFirebase();
        unsubscribe = onAuthStateChange(authUser => {
          if (authUser) {
            navigation.replace('HomeScreen', { signedUp: 0 });
          } else {
            setIsLoading(false);
          }
        });
      } catch {
        setIsLoading(false);
      }
    };

    initAuth();

    return () => {
      unsubscribe?.();
    };
  }, [navigation]);

  const signIn = async () => {
    if (!email || !password) {
      Alert.alert('Missing information', 'Enter your email and password.');
      return;
    }

    try {
      setIsLoading(true);
      const result = await loginWithEmail(email, password);
      if (!result.success) {
        Alert.alert('Login failed', result.error || 'Login failed. Please try again.');
        setIsLoading(false);
      }
    } catch {
      Alert.alert('Login failed', 'Please try again.');
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      const result = await signInWithGoogle();
      if (!result.success) {
        Alert.alert('Google sign-in failed', result.error || 'Google sign-in failed. Please try again.');
        setIsLoading(false);
      }
    } catch {
      Alert.alert('Google sign-in failed', 'Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Sign in to WhisperLang</Text>
          <Text style={styles.subtitle}>Access your account to continue.</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#8e93a9"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.fieldHeader}>
              <Text style={styles.label}>Password</Text>
              <TouchableOpacity onPress={() => setShowPassword(prev => !prev)}>
                <Text style={styles.toggle}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#8e93a9"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity style={[styles.primaryButton, isLoading && styles.buttonDisabled]} onPress={signIn} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#f8f9ff" /> : <Text style={styles.primaryButtonText}>Sign in</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={[styles.secondaryButton, isLoading && styles.buttonDisabled]} onPress={handleGoogleSignIn} disabled={isLoading}>
            <Text style={styles.secondaryButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('RegisterScreen')} disabled={isLoading}>
            <Text style={styles.linkText}>Create an account</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>By signing in, you agree to the Terms of Service and Privacy Policy.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c10'
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 32
  },
  header: {
    gap: 8
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f4f5f9'
  },
  subtitle: {
    fontSize: 15,
    color: '#9da3bd'
  },
  form: {
    gap: 20
  },
  fieldGroup: {
    gap: 8
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f4f5f9'
  },
  toggle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8aa2ff'
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2337',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#f4f5f9',
    backgroundColor: '#111320'
  },
  primaryButton: {
    borderRadius: 12,
    backgroundColor: '#5560f6',
    paddingVertical: 14,
    alignItems: 'center'
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f8f9ff'
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2337',
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#141726'
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f4f5f9'
  },
  linkButton: {
    alignItems: 'center'
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8aa2ff'
  },
  buttonDisabled: {
    opacity: 0.6
  },
  footer: {
    fontSize: 12,
    color: '#6f748c',
    textAlign: 'center'
  }
});