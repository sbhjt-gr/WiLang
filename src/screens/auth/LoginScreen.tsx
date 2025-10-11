import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, StyleSheet, Image, Platform, ScrollView, TouchableOpacity, StatusBar, TextInput, Keyboard, TouchableWithoutFeedback, ActivityIndicator } from 'react-native';
import { Text } from '@rneui/themed';
import { StackNavigationProp } from '@react-navigation/stack';
import { loginWithEmail, initializeFirebase, signInWithGoogle, onAuthStateChange } from '../../services/FirebaseService';
import { RootStackParamList } from '../../types/navigation';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'LoginScreen'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [emailFocused, setEmailFocused] = useState<boolean>(false);
  const [passwordFocused, setPasswordFocused] = useState<boolean>(false);
  const [keyboardVisible, setKeyboardVisible] = useState<boolean>(false);
  const { colors } = useTheme();

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);
  
  const signIn = async (): Promise<void> => {
    if (email && password) {
      try {
        setIsLoading(true);
        const result = await loginWithEmail(email, password);
        if (!result.success) {
          alert(result.error || 'Login failed');
          setIsLoading(false);
        }
      } catch (err: any) {
        alert('Login failed. Please try again.');
        setIsLoading(false);
      }
    } else {
      alert("Enter all your details first!");
    }
  };

  const handleGoogleSignIn = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const result = await signInWithGoogle();
      if (!result.success) {
        alert(result.error || 'Google sign-in failed');
        setIsLoading(false);
      }
    } catch (err: any) {
      alert('Google sign-in failed. Please try again.');
      setIsLoading(false);
    }
  };
  
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false
    });
  }, []);
  
  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsLoading(true);
        await initializeFirebase();

        const unsubscribe = onAuthStateChange((authUser) => {
          if (authUser) {
            navigation.replace('HomeScreen', {signedUp: 0});
          } else {
            setIsLoading(false);
          }
        });
        return unsubscribe;
      } catch (_error) {
        setIsLoading(false);
      }
    };
    
    initAuth();
  }, []);

  const renderInput = (
    placeholder: string,
    value: string,
    onChangeText: (text: string) => void,
    icon: keyof typeof Ionicons.glyphMap,
    isPassword: boolean = false,
    focused: boolean,
    setFocused: (focused: boolean) => void
  ) => (
    <View style={styles.inputContainer}>
      <TouchableWithoutFeedback>
        <View style={[
          styles.inputWrapper,
          { backgroundColor: colors.surface, borderColor: colors.border },
          focused && { borderColor: colors.borderFocus, backgroundColor: colors.surface }
        ]}>
          <Ionicons name={icon} size={20} color={focused ? colors.primary : colors.textTertiary} style={styles.inputIcon} />
        <TextInput
          style={[styles.textInput, { color: colors.text }]}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isPassword && !showPassword}
          keyboardType={placeholder.includes('Email') ? 'email-address' : 'default'}
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect={false}
          textContentType="none"
          passwordRules=""
          onFocus={() => {
            setFocused(true);
            setKeyboardVisible(true);
          }}
          onBlur={() => setFocused(false)}
          onSubmitEditing={isPassword ? signIn : undefined}
          blurOnSubmit={false}
          returnKeyType={isPassword ? 'done' : 'next'}
          importantForAutofill="no"
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
                  )}
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
    
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

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

      <TouchableWithoutFeedback onPress={() => {}}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          scrollEnabled={true}
          automaticallyAdjustKeyboardInsets={false}
        >
          <View 
            style={styles.logoSection}
          >
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../../assets/video-call-blue.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.welcomeTitle}>Welcome Back</Text>
            <Text style={styles.welcomeSubtitle}>Sign in to continue your journey</Text>
          </View>

          <View
            style={styles.formSection}
          >
            <View style={[styles.loginCard, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.loginTitle, { color: colors.text }]}>Sign In</Text>
              
              {renderInput(
                "Email Address",
                email,
                setEmail,
                "mail-outline",
                false,
                emailFocused,
                setEmailFocused
              )}
              
              {renderInput(
                "Password",
                password,
                setPassword,
                "lock-closed-outline",
                true,
                passwordFocused,
                setPasswordFocused
              )}
              
              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.signInButton, isLoading && styles.signInButtonDisabled]}
                onPress={signIn}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={colors.gradient1}
                  style={styles.signInGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isLoading ? (
                    <>
                      <ActivityIndicator color={colors.textInverse} style={styles.buttonIcon} />
                      <Text style={[styles.signInButtonText, { color: colors.textInverse }]}>Signing in...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="log-in-outline" size={20} color={colors.textInverse} style={styles.buttonIcon} />
                      <Text style={[styles.signInButtonText, { color: colors.textInverse }]}>Sign In</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              
              <View style={styles.dividerContainer}>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Text style={[styles.dividerText, { color: colors.textTertiary }]}>or</Text>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              </View>

              <TouchableOpacity
                style={[styles.googleButton, isLoading && styles.signInButtonDisabled]}
                onPress={handleGoogleSignIn}
                disabled={isLoading}
              >
                <Ionicons name="logo-google" size={20} color="#ffffff" style={styles.buttonIcon} />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.createAccountButton, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                onPress={() => navigation.navigate('RegisterScreen')}
              >
                <Ionicons name="person-add-outline" size={20} color={colors.primary} style={styles.buttonIcon} />
                <Text style={[styles.createAccountButtonText, { color: colors.primary }]}>Create New Account</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By signing in, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    minHeight: '100%',
  },

  logoSection: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 60,
    height: 60,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 22,
  },
  formSection: {
    flex: 1,
    justifyContent: 'center',
  },
  loginCard: {
    borderRadius: 24,
    padding: 32,
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 2,
  },
  inputWrapperFocused: {
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  eyeIcon: {
    padding: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
  },
  signInButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  signInButtonDisabled: {
    opacity: 0.6,
  },
  signInGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  buttonIcon: {
    marginRight: 8,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    fontWeight: '500',
  },
  createAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 2,
  },
  createAccountButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#db4437',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  footer: {
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 18,
  },
  modal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    minWidth: 200,
  },
  loadingText: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '600',
    marginTop: 16,
  },
}); 