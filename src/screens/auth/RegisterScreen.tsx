import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Text } from '@rneui/themed';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../types/navigation';
import { registerWithEmail, signInWithGoogle } from '../../services/FirebaseService';

type RegisterScreenNavigationProp = StackNavigationProp<RootStackParamList, 'RegisterScreen'>;

interface Props {
  navigation: RegisterScreenNavigationProp;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterScreen({ navigation }: Props) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Phone number must be 10 digits';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async (): Promise<void> => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);
      const result = await registerWithEmail(formData.name, formData.email, formData.password);

      if (result.success) {
        Alert.alert('Success', 'Account created successfully! Please check your email for verification.', [
          { text: 'OK', onPress: () => navigation.replace('HomeScreen', { signedUp: 1 }) }
        ]);
      } else {
        Alert.alert('Registration failed', result.error || 'Registration failed. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const result = await signInWithGoogle();

      if (result.success) {
        navigation.replace('HomeScreen', { signedUp: 1 });
      } else {
        Alert.alert('Google sign-up failed', result.error || 'Google sign-up failed. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Google sign-up failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Create your WhisperLang account</Text>
          <Text style={styles.subtitle}>Enter your details to begin.</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={styles.input}
              placeholder="John Doe"
              placeholderTextColor="#8e93a9"
              value={formData.name}
              onChangeText={text => updateFormData('name', text)}
              autoCapitalize="words"
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#8e93a9"
              value={formData.email}
              onChangeText={text => updateFormData('email', text)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Phone number</Text>
            <TextInput
              style={styles.input}
              placeholder="5551234567"
              placeholderTextColor="#8e93a9"
              value={formData.phone}
              onChangeText={text => updateFormData('phone', text)}
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
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
              placeholder="Create a password"
              placeholderTextColor="#8e93a9"
              value={formData.password}
              onChangeText={text => updateFormData('password', text)}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.fieldHeader}>
              <Text style={styles.label}>Confirm password</Text>
              <TouchableOpacity onPress={() => setShowConfirmPassword(prev => !prev)}>
                <Text style={styles.toggle}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Re-enter your password"
              placeholderTextColor="#8e93a9"
              value={formData.confirmPassword}
              onChangeText={text => updateFormData('confirmPassword', text)}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={handleRegister}
            />
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
          </View>

          <TouchableOpacity style={[styles.primaryButton, isLoading && styles.buttonDisabled]} onPress={handleRegister} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#f8f9ff" /> : <Text style={styles.primaryButtonText}>Create account</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={[styles.secondaryButton, isLoading && styles.buttonDisabled]} onPress={handleGoogleSignUp} disabled={isLoading}>
            <Text style={styles.secondaryButtonText}>Sign up with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('LoginScreen')} disabled={isLoading}>
            <Text style={styles.linkText}>Back to sign in</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>By creating an account, you agree to the Terms of Service and Privacy Policy.</Text>
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
  errorText: {
    fontSize: 12,
    color: '#ff6b6b'
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