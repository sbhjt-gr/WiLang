import React, { useState, useLayoutEffect, useEffect } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, StatusBar, TextInput, Alert } from 'react-native';
import { Text, Image } from '@rneui/themed';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '../config/firebase';
import { useTheme } from '../theme';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'HomeScreen'>;
type HomeScreenRouteProp = RouteProp<RootStackParamList, 'HomeScreen'>;

interface Props {
  navigation: HomeScreenNavigationProp;
  route: HomeScreenRouteProp;
}

export default function HomeScreen({ navigation, route }: Props) {
  const [id, setID] = useState<string>('');
  const [focusedField, setFocusedField] = useState<string>('');
  const { colors, theme } = useTheme();

  const meet = (): void => {
    if (id.trim()) {
      navigation.navigate('VideoCallScreen', {id: id, type: 'join', joinCode: id});
    } else {
      Alert.alert("Missing Meeting ID", "Please enter a valid meeting ID to join the call.");
    }
  };
  
  const createMeeting = (): void => {
    const meetingId = `MEET_${Date.now()}`;
    navigation.navigate('VideoCallScreen', {id: meetingId});
  };
  
  const LogOut = async (): Promise<void> => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Sign Out", 
          style: "destructive",
          onPress: async () => {
            try {
              await auth.signOut();
              navigation.replace("LoginScreen");
            } catch (error) {
              Alert.alert("Error", "Failed to sign out. Please try again.");
            }
          }
        }
      ]
    );
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.primary} />

      <LinearGradient
        colors={colors.gradient1}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Floating circles for visual appeal */}
      <View style={[styles.floatingCircle, styles.circle1]} />
      <View style={[styles.floatingCircle, styles.circle2]} />
      <View style={[styles.floatingCircle, styles.circle3]} />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Header Section */}
          <View 
            style={styles.headerSection}
          >
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../assets/video-call-blue.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.welcomeTitle}>Welcome to WiLang</Text>
            <Text style={styles.welcomeSubtitle}>Connect through secure video calls</Text>
          </View>

          {/* Quick Start Section */}
          <View 
            style={styles.quickStartSection}
          >
            <View style={styles.quickStartCard}>
              <LinearGradient
                colors={colors.gradient1}
                style={styles.startCallGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="videocam-outline" size={32} color={colors.textInverse} style={styles.startCallIcon} />
                <Text style={[styles.startCallTitle, { color: colors.textInverse }]}>Start New Call</Text>
                <Text style={[styles.startCallSubtitle, { color: colors.textInverse, opacity: 0.9 }]}>Begin a secure video call with anyone</Text>

                <TouchableOpacity
                  style={[styles.startCallButton, { backgroundColor: colors.surface }]}
                  onPress={createMeeting}
                >
                  <Text style={[styles.startCallButtonText, { color: colors.primary }]}>Start a Video Call</Text>
                  <Ionicons name="arrow-forward" size={20} color={colors.primary} />
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>

          {/* Join Meeting Section */}
          <View 
            style={styles.joinSection}
          >
            <View style={[styles.joinCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Join Meeting</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Enter a meeting ID to join an existing call</Text>

              <View style={[
                styles.inputWrapper,
                { backgroundColor: colors.background, borderColor: colors.border },
                focusedField === 'meetingId' && { borderColor: colors.borderFocus, backgroundColor: colors.surface }
              ]}>
                <Ionicons name="enter-outline" size={20} color={focusedField === 'meetingId' ? colors.primary : colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  placeholder="Enter meeting ID"
                  placeholderTextColor={colors.textTertiary}
                  value={id}
                  onChangeText={setID}
                  keyboardType="default"
                  onFocus={() => setFocusedField('meetingId')}
                  onBlur={() => setFocusedField('')}
                  onSubmitEditing={meet}
                />
              </View>

              <TouchableOpacity
                style={[styles.joinButton, !id.trim() && styles.joinButtonDisabled]}
                onPress={meet}
                disabled={!id.trim()}
              >
                <LinearGradient
                  colors={id.trim() ? colors.gradient1 : [colors.textTertiary, colors.textSecondary]}
                  style={styles.joinGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="log-in-outline" size={20} color={colors.textInverse} style={styles.buttonIcon} />
                  <Text style={[styles.joinButtonText, { color: colors.textInverse }]}>Join Meeting</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Actions Section */}
          <View
            style={styles.quickActionsSection}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>

            <View style={styles.actionsGrid}>
              <TouchableOpacity style={styles.actionCard}>
                <LinearGradient
                  colors={colors.gradient2}
                  style={styles.actionGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="settings-outline" size={24} color={colors.textInverse} />
                  <Text style={[styles.actionTitle, { color: colors.textInverse }]}>Settings</Text>
                  <Text style={[styles.actionSubtitle, { color: colors.textInverse, opacity: 0.8 }]}>App preferences</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => navigation.navigate('EnvironmentConfig')}
              >
                <LinearGradient
                  colors={colors.gradient3}
                  style={styles.actionGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="server-outline" size={24} color={colors.textInverse} />
                  <Text style={[styles.actionTitle, { color: colors.textInverse }]}>Server Config</Text>
                  <Text style={[styles.actionSubtitle, { color: colors.textInverse, opacity: 0.8 }]}>Environment setup</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.actionsGrid}>
              <TouchableOpacity style={styles.actionCard} onPress={LogOut}>
                <LinearGradient
                  colors={colors.gradient5}
                  style={styles.actionGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="log-out-outline" size={24} color={colors.textInverse} />
                  <Text style={[styles.actionTitle, { color: colors.textInverse }]}>Sign Out</Text>
                  <Text style={[styles.actionSubtitle, { color: colors.textInverse, opacity: 0.8 }]}>Log out</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
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
    top: 300,
    left: 50,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  keyboardView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  headerSection: {
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
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  quickStartSection: {
    marginBottom: 32,
  },
  quickStartCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  startCallGradient: {
    alignItems: 'center',
    padding: 32,
  },
  startCallIcon: {
    marginBottom: 16,
  },
  startCallTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  startCallSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  startCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    justifyContent: 'center',
  },
  startCallButtonText: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
    letterSpacing: 0.5,
  },
  joinSection: {
    marginBottom: 32,
  },
  joinCard: {
    borderRadius: 20,
    padding: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 2,
    marginBottom: 20,
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
  joinButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  joinButtonDisabled: {
    opacity: 0.6,
  },
  joinGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  buttonIcon: {
    marginRight: 8,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  quickActionsSection: {
    marginBottom: 40,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  actionCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    minHeight: 100,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    textAlign: 'center',
  },
}); 