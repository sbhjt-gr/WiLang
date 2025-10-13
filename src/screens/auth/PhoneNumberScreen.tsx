import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, StatusBar, ScrollView, TouchableWithoutFeedback, Image } from 'react-native';
import { Text } from '@rneui/themed';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types/navigation';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { updateUserPhone, checkPhoneNumberExists } from '../../services/FirebaseService';

type PhoneNumberScreenNavigationProp = StackNavigationProp<RootStackParamList, 'PhoneNumberScreen'>;
type PhoneNumberScreenRouteProp = RouteProp<RootStackParamList, 'PhoneNumberScreen'>;

interface Props {
  navigation: PhoneNumberScreenNavigationProp;
  route: PhoneNumberScreenRouteProp;
}

export default function PhoneNumberScreen({ navigation, route }: Props) {
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [phoneError, setPhoneError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [phoneFocused, setPhoneFocused] = useState<boolean>(false);
  const { colors } = useTheme();

  const fromScreen = route.params?.from || 'login';

  const handleSubmit = async (): Promise<void> => {
    if (!phoneNumber.trim()) {
      setPhoneError('phone_required');
      return;
    }

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setPhoneError('phone_invalid');
      return;
    }

    try {
      setIsLoading(true);
      
      const phoneWithPrefix = `+91${cleanPhone}`;
      
      const phoneCheck = await checkPhoneNumberExists(phoneWithPrefix);
      
      if (phoneCheck.error) {
        setPhoneError(phoneCheck.error);
        setIsLoading(false);
        return;
      }
      
      if (phoneCheck.exists) {
        setPhoneError('phone_already_exists');
        setIsLoading(false);
        return;
      }
      
      const result = await updateUserPhone(phoneWithPrefix);
      
      if (result.success) {
        navigation.replace('AccountLoadingScreen', { 
          from: fromScreen, 
          signedUp: fromScreen === 'register' ? 1 : 0 
        });
      } else {
        setPhoneError(result.error || 'phone_update_failed');
        setIsLoading(false);
      }
    } catch (err: any) {
      setPhoneError('phone_update_failed');
      setIsLoading(false);
    }
  };

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
          >
            <View style={styles.logoSection}>
              <View style={styles.logoContainer}>
                <Ionicons name="call-outline" size={56} color="#ffffff" />
              </View>
              <Text style={styles.welcomeTitle}>Complete Your Profile</Text>
              <Text style={styles.welcomeSubtitle}>
                Please provide your phone number to continue.
              </Text>
            </View>

            <View style={styles.formSection}>
              <View style={[styles.phoneCard, { backgroundColor: colors.surfaceSecondary }]}>
                <Text style={[styles.phoneTitle, { color: colors.text }]}>Phone Number</Text>
                
                <View style={styles.inputContainer}>
                  <View style={[
                    styles.inputWrapper,
                    { backgroundColor: colors.surface, borderColor: phoneError ? colors.error : colors.border },
                    phoneFocused && { borderColor: colors.borderFocus, backgroundColor: colors.surface }
                  ]}>
                    <Ionicons 
                      name="call-outline" 
                      size={20} 
                      color={phoneFocused ? colors.primary : colors.textTertiary} 
                      style={styles.inputIcon} 
                    />
                    <Text style={[styles.prefixText, { color: colors.text }]}>+91</Text>
                    <TextInput
                      style={[styles.textInput, { color: colors.text }]}
                      placeholder="Enter 10 digit phone number"
                      placeholderTextColor={colors.textTertiary}
                      value={phoneNumber}
                      onChangeText={(text) => {
                        const cleanedText = text.replace(/\D/g, '');
                        if (cleanedText.length <= 10) {
                          setPhoneNumber(cleanedText);
                          setPhoneError("");
                        }
                      }}
                      keyboardType="phone-pad"
                      autoFocus
                      onSubmitEditing={handleSubmit}
                      editable={!isLoading}
                      onFocus={() => setPhoneFocused(true)}
                      onBlur={() => setPhoneFocused(false)}
                      returnKeyType="done"
                      maxLength={10}
                    />
                  </View>
                </View>
                
                {phoneError ? (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={16} color={colors.error} />
                    <Text style={[styles.errorText, { color: colors.error }]}>
                      {phoneError === 'phone_required' && 'Phone number is required'}
                      {phoneError === 'phone_invalid' && 'Please enter exactly 10 digits'}
                      {phoneError === 'phone_already_exists' && 'This phone number is already registered with another account'}
                      {phoneError === 'phone_update_failed' && 'Failed to update phone number. Please try again.'}
                      {!['phone_required', 'phone_invalid', 'phone_already_exists', 'phone_update_failed'].includes(phoneError) && phoneError}
                    </Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={isLoading}
                >
                  <LinearGradient
                    colors={colors.gradient1}
                    style={styles.submitGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {isLoading ? (
                      <>
                        <ActivityIndicator color={colors.textInverse} style={styles.buttonIcon} />
                        <Text style={[styles.submitButtonText, { color: colors.textInverse }]}>Processing...</Text>
                      </>
                    ) : (
                      <>
                        <Text style={[styles.submitButtonText, { color: colors.textInverse }]}>Continue</Text>
                        <Ionicons name="arrow-forward" size={20} color={colors.textInverse} style={styles.buttonIcon} />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                By providing your phone number, you agree to our Terms of Service and Privacy Policy
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
    paddingHorizontal: 16,
  },
  formSection: {
    flex: 1,
    justifyContent: 'center',
  },
  phoneCard: {
    borderRadius: 24,
    padding: 32,
  },
  phoneTitle: {
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
  inputIcon: {
    marginRight: 12,
  },
  prefixText: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 13,
    marginLeft: 6,
    flex: 1,
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 8,
  },
  infoIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
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
});
