import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Platform, TouchableOpacity, StatusBar, TextInput, Alert } from 'react-native';
import { Text, Image } from '@rneui/themed';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/navigation';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

type CallsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'HomeScreen'>;

interface Props {
  navigation: CallsScreenNavigationProp;
}

export default function CallsScreen({ navigation }: Props) {
  const [id, setID] = useState<string>('');
  const [activeFeature, setActiveFeature] = useState<string>('instant');
  const textInputRef = useRef<TextInput>(null);

  const meet = (): void => {
    if (id.trim()) {
      const rawInput = id.trim();
      const isOnlyNumeric = /^[0-9]+$/.test(rawInput);
      const numericId = parseInt(rawInput);
      if (isOnlyNumeric && !isNaN(numericId)) {
        navigation.navigate('VideoCallScreen', {
          id: numericId.toString(), 
          type: 'join',
          joinCode: numericId.toString()
        });
      } else {
        const cleanCode = rawInput.toUpperCase();
        
        if (/^[A-Z0-9]{4,8}$/.test(cleanCode)) {
          navigation.navigate('VideoCallScreen', {
            id: Date.now().toString(),
            type: 'join',
            joinCode: cleanCode
          });
        } else {
          Alert.alert("Invalid Code", "Join codes should be 4-8 characters using letters and numbers only.");
        }
      }
    } else {
      Alert.alert("Missing Meeting ID", "Please enter a valid meeting ID or join code to join the call.");
    }
  };
  
  const createMeeting = (): void => {
    const meetingId = `INSTANT_${Date.now()}`;
    navigation.navigate('VideoCallScreen', {
      id: meetingId,
      type: 'instant'
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        automaticallyAdjustKeyboardInsets={true}
        nestedScrollEnabled={false}
      >
        <View 
          style={styles.heroSection}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroHeader}>
              <View style={styles.heroIcon}>
                <Ionicons name="videocam" size={28} color="#667eea" />
              </View>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE TRANSLATION</Text>
              </View>
            </View>
            <Text style={styles.heroTitle}>WhisperLang Video</Text>
            <Text style={styles.heroSubtitle}>Connect with anyone, anywhere in the world with real-time translation in over 30 languages</Text>
            
            <View style={styles.featureToggle}>
              <TouchableOpacity 
                style={[styles.toggleButton, activeFeature === 'instant' && styles.toggleButtonActive]}
                onPress={() => setActiveFeature('instant')}
              >
                <Ionicons name="flash" size={16} color={activeFeature === 'instant' ? '#ffffff' : '#667eea'} />
                <Text style={[styles.toggleText, activeFeature === 'instant' && styles.toggleTextActive]}>
                  Instant Call
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.toggleButton, activeFeature === 'scheduled' && styles.toggleButtonActive]}
                onPress={() => setActiveFeature('scheduled')}
              >
                <Ionicons name="calendar" size={16} color={activeFeature === 'scheduled' ? '#ffffff' : '#667eea'} />
                <Text style={[styles.toggleText, activeFeature === 'scheduled' && styles.toggleTextActive]}>
                  Schedule
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View 
          style={styles.actionsSection}
        >
          {activeFeature === 'instant' ? (
            <View style={styles.instantActions}>
              <TouchableOpacity 
                style={styles.primaryActionCard}
                onPress={createMeeting}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.primaryActionGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="videocam" size={32} color="#ffffff" />
                  <Text style={styles.primaryActionTitle}>Start a meeting</Text>
                  <Text style={styles.primaryActionSubtitle}>Begin translating immediately</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <View style={styles.secondaryActions}>
                <TouchableOpacity 
                  style={styles.secondaryActionCard}
                  onPress={() => {}}
                >
                  <View style={styles.secondaryActionContent}>
                    <Ionicons name="mic" size={24} color="#10b981" />
                    <Text style={styles.secondaryActionTitle}>Voice Only</Text>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.secondaryActionCard}
                  onPress={() => {}}
                >
                  <View style={styles.secondaryActionContent}>
                    <Ionicons name="people" size={24} color="#f59e0b" />
                    <Text style={styles.secondaryActionTitle}>Group Call</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.scheduledActions}>
              <TouchableOpacity 
                style={styles.scheduleCard}
                onPress={() => {}}
              >
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={styles.scheduleGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="calendar-outline" size={28} color="#ffffff" />
                  <Text style={styles.scheduleTitle}>Schedule Meeting</Text>
                  <Text style={styles.scheduleSubtitle}>Plan ahead with calendar integration</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <View style={styles.upcomingMeetings}>
                <Text style={styles.upcomingTitle}>Upcoming Meetings</Text>
                <View style={styles.meetingCard}>
                  <View style={styles.meetingTime}>
                    <Text style={styles.meetingTimeText}>2:30 PM</Text>
                    <Text style={styles.meetingDate}>Today</Text>
                  </View>
                  <View style={styles.meetingInfo}>
                    <Text style={styles.meetingTitle}>Team Sync</Text>
                    <Text style={styles.meetingParticipants}>3 participants</Text>
                  </View>
                  <TouchableOpacity style={styles.joinEarlyButton}>
                    <Text style={styles.joinEarlyText}>Join</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>

        <View style={styles.joinSection}>
          <View style={styles.joinCard}>
            <View style={styles.joinHeader}>
              <Ionicons name="enter-outline" size={20} color="#667eea" />
              <Text style={styles.sectionTitle}>Join a Meeting</Text>
            </View>
            
            <View style={styles.inputContainer}>
              <TextInput
                ref={textInputRef}
                style={styles.meetingInput}
                placeholder="Enter meeting code (e.g. ABC123)"
                placeholderTextColor="#9ca3af"
                value={id}
                onChangeText={setID}
                autoCapitalize="characters"
                autoCorrect={false}
                autoComplete="off"
                keyboardType="default"
                returnKeyType="done"
                onSubmitEditing={meet}
              />
            </View>
            
            <TouchableOpacity 
              style={[styles.joinMeetingButton, !id.trim() && styles.joinMeetingButtonDisabled]}
              onPress={meet}
              disabled={!id.trim()}
            >
              <Text style={[styles.joinMeetingButtonText, !id.trim() && styles.joinMeetingButtonTextDisabled]}>
                Join Meeting
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View 
          style={styles.recentSection}
        >
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.recentCard}>
            <View style={styles.recentItem}>
              <View style={styles.recentIcon}>
                <Ionicons name="videocam" size={20} color="#667eea" />
              </View>
              <View style={styles.recentContent}>
                <Text style={styles.recentTitle}>Video Call with Sarah</Text>
                <Text style={styles.recentTime}>2 hours ago • 25 minutes • 🇪🇸 Spanish</Text>
              </View>
              <TouchableOpacity style={styles.recentAction}>
                <Ionicons name="call-outline" size={16} color="#667eea" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.recentItem}>
              <View style={styles.recentIcon}>
                <Ionicons name="people" size={20} color="#10b981" />
              </View>
              <View style={styles.recentContent}>
                <Text style={styles.recentTitle}>Team Meeting</Text>
                <Text style={styles.recentTime}>Yesterday • 45 minutes • 🇫🇷 French, 🇩🇪 German</Text>
              </View>
              <TouchableOpacity style={styles.recentAction}>
                <Ionicons name="repeat-outline" size={16} color="#667eea" />
              </TouchableOpacity>
            </View>

            <View style={styles.recentItem}>
              <View style={styles.recentIcon}>
                <Ionicons name="mic" size={20} color="#f59e0b" />
              </View>
              <View style={styles.recentContent}>
                <Text style={styles.recentTitle}>Voice Call with Alex</Text>
                <Text style={styles.recentTime}>3 days ago • 15 minutes • 🇯🇵 Japanese</Text>
              </View>
              <TouchableOpacity style={styles.recentAction}>
                <Ionicons name="call-outline" size={16} color="#667eea" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View 
          style={styles.languageBanner}
        >
          <LinearGradient
            colors={['#8b5cf6', '#ec4899']}
            style={styles.languageGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="globe-outline" size={24} color="#ffffff" />
            <View style={styles.languageContent}>
              <Text style={styles.languageTitle}>30+ Languages Supported</Text>
              <Text style={styles.languageSubtitle}>Real-time translation powered by AI</Text>
            </View>
            <TouchableOpacity style={styles.languageButton}>
              <Ionicons name="arrow-forward" size={16} color="#ffffff" />
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  heroSection: {
    marginBottom: 24,
  },
  heroContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f4ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
    marginRight: 6,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  featureToggle: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#667eea',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
    marginLeft: 6,
  },
  toggleTextActive: {
    color: '#ffffff',
  },
  actionsSection: {
    marginBottom: 24,
  },
  instantActions: {
    gap: 16,
  },
  primaryActionCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  primaryActionGradient: {
    padding: 32,
    alignItems: 'center',
  },
  primaryActionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 12,
    marginBottom: 4,
  },
  primaryActionSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryActionCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  secondaryActionContent: {
    alignItems: 'center',
  },
  secondaryActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 8,
  },
  scheduledActions: {
    gap: 20,
  },
  scheduleCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  scheduleGradient: {
    padding: 28,
    alignItems: 'center',
  },
  scheduleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 12,
    marginBottom: 4,
  },
  scheduleSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  upcomingMeetings: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
  },
  upcomingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  meetingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  meetingTime: {
    alignItems: 'center',
    marginRight: 16,
  },
  meetingTimeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#667eea',
  },
  meetingDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  meetingInfo: {
    flex: 1,
  },
  meetingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  meetingParticipants: {
    fontSize: 14,
    color: '#6b7280',
  },
  joinEarlyButton: {
    backgroundColor: '#667eea',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  joinEarlyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  joinSection: {
    marginBottom: 24,
  },
  joinCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
  },
  joinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  inputContainer: {
    marginBottom: 20,
  },
  meetingInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1f2937',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  joinMeetingButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinMeetingButtonDisabled: {
    backgroundColor: '#e5e7eb',
  },
  joinMeetingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  joinMeetingButtonTextDisabled: {
    color: '#9ca3af',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  inputWrapperFocused: {
    borderColor: '#667eea',
    backgroundColor: '#ffffff',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    paddingVertical: 12,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: '#667eea',
  },
  joinButtonDisabled: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
  },
  joinButtonTextDisabled: {
    color: '#9ca3af',
  },
  joinButtonIcon: {
    marginLeft: 8,
  },
  recentSection: {
    marginBottom: 24,
  },
  recentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  recentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f4ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recentContent: {
    flex: 1,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  recentTime: {
    fontSize: 14,
    color: '#6b7280',
  },
  recentAction: {
    padding: 8,
    backgroundColor: '#f0f4ff',
    borderRadius: 8,
  },
  languageBanner: {
    marginBottom: 24,
  },
  languageGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
  },
  languageContent: {
    flex: 1,
    marginLeft: 16,
  },
  languageTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  languageSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  languageButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
