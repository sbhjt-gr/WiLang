import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Platform, TouchableOpacity, StatusBar, TextInput, Alert } from 'react-native';
import { Text, Image } from '@rneui/themed';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/navigation';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

type CallsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'HomeScreen'>;

interface Props {
  navigation: CallsScreenNavigationProp;
}

export default function CallsScreen({ navigation }: Props) {
  const [id, setID] = useState<string>('');
  const [activeFeature, setActiveFeature] = useState<string>('instant');
  const textInputRef = useRef<TextInput>(null);
  const { colors } = useTheme();

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
          <View style={[styles.heroContent, { backgroundColor: colors.surface }]}>
            <View style={styles.heroHeader}>
              <View style={[styles.heroIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="videocam" size={28} color={colors.primary} />
              </View>
              <View style={[styles.liveBadge, { backgroundColor: colors.error }]}>
                <View style={[styles.liveDot, { backgroundColor: colors.textInverse }]} />
                <Text style={[styles.liveText, { color: colors.textInverse }]}>LIVE TRANSLATION</Text>
              </View>
            </View>
            <Text style={[styles.heroTitle, { color: colors.text }]}>WhisperLang Video</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>Connect with anyone, anywhere in the world with real-time translation in over 30 languages</Text>
            
            <View style={[styles.featureToggle, { backgroundColor: colors.backgroundTertiary }]}>
              <TouchableOpacity
                style={[styles.toggleButton, activeFeature === 'instant' && { backgroundColor: colors.primary }]}
                onPress={() => setActiveFeature('instant')}
              >
                <Ionicons name="flash" size={16} color={activeFeature === 'instant' ? colors.textInverse : colors.primary} />
                <Text style={[styles.toggleText, { color: colors.primary }, activeFeature === 'instant' && { color: colors.textInverse }]}>
                  Instant Call
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, activeFeature === 'scheduled' && { backgroundColor: colors.primary }]}
                onPress={() => setActiveFeature('scheduled')}
              >
                <Ionicons name="calendar" size={16} color={activeFeature === 'scheduled' ? colors.textInverse : colors.primary} />
                <Text style={[styles.toggleText, { color: colors.primary }, activeFeature === 'scheduled' && { color: colors.textInverse }]}>
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
                  colors={colors.gradient1}
                  style={styles.primaryActionGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="videocam" size={32} color={colors.textInverse} />
                  <Text style={[styles.primaryActionTitle, { color: colors.textInverse }]}>Start a meeting</Text>
                  <Text style={styles.primaryActionSubtitle}>Begin translating immediately</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <View style={styles.secondaryActions}>
                <TouchableOpacity
                  style={[styles.secondaryActionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => {}}
                >
                  <View style={styles.secondaryActionContent}>
                    <Ionicons name="mic" size={24} color={colors.success} />
                    <Text style={[styles.secondaryActionTitle, { color: colors.text }]}>Voice Only</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryActionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => {}}
                >
                  <View style={styles.secondaryActionContent}>
                    <Ionicons name="people" size={24} color={colors.warning} />
                    <Text style={[styles.secondaryActionTitle, { color: colors.text }]}>Group Call</Text>
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
                  colors={colors.gradient6}
                  style={styles.scheduleGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="calendar-outline" size={28} color={colors.textInverse} />
                  <Text style={[styles.scheduleTitle, { color: colors.textInverse }]}>Schedule Meeting</Text>
                  <Text style={styles.scheduleSubtitle}>Plan ahead with calendar integration</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <View style={[styles.upcomingMeetings, { backgroundColor: colors.surface }]}>
                <Text style={[styles.upcomingTitle, { color: colors.text }]}>Upcoming Meetings</Text>
                <View style={[styles.meetingCard, { backgroundColor: colors.backgroundTertiary }]}>
                  <View style={styles.meetingTime}>
                    <Text style={[styles.meetingTimeText, { color: colors.primary }]}>2:30 PM</Text>
                    <Text style={[styles.meetingDate, { color: colors.textSecondary }]}>Today</Text>
                  </View>
                  <View style={styles.meetingInfo}>
                    <Text style={[styles.meetingTitle, { color: colors.text }]}>Team Sync</Text>
                    <Text style={[styles.meetingParticipants, { color: colors.textSecondary }]}>3 participants</Text>
                  </View>
                  <TouchableOpacity style={[styles.joinEarlyButton, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.joinEarlyText, { color: colors.textInverse }]}>Join</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>

        <View style={styles.joinSection}>
          <View style={[styles.joinCard, { backgroundColor: colors.surface }]}>
            <View style={styles.joinHeader}>
              <Ionicons name="enter-outline" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Join a Meeting</Text>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                ref={textInputRef}
                style={[styles.meetingInput, { backgroundColor: colors.backgroundTertiary, color: colors.text, borderColor: colors.border }]}
                placeholder="Enter meeting code (e.g. ABC123)"
                placeholderTextColor={colors.textTertiary}
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
              style={[styles.joinMeetingButton, { backgroundColor: colors.primary }, !id.trim() && { backgroundColor: colors.border }]}
              onPress={meet}
              disabled={!id.trim()}
            >
              <Text style={[styles.joinMeetingButtonText, { color: colors.textInverse }, !id.trim() && { color: colors.textTertiary }]}>
                Join Meeting
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={styles.recentSection}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
          <View style={[styles.recentCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.recentItem, { borderBottomColor: colors.borderLight }]}>
              <View style={[styles.recentIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="videocam" size={20} color={colors.primary} />
              </View>
              <View style={styles.recentContent}>
                <Text style={[styles.recentTitle, { color: colors.text }]}>Video Call with Sarah</Text>
                <Text style={[styles.recentTime, { color: colors.textSecondary }]}>2 hours ago • 25 minutes • 🇪🇸 Spanish</Text>
              </View>
              <TouchableOpacity style={[styles.recentAction, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="call-outline" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.recentItem, { borderBottomColor: colors.borderLight }]}>
              <View style={[styles.recentIcon, { backgroundColor: colors.successLight }]}>
                <Ionicons name="people" size={20} color={colors.success} />
              </View>
              <View style={styles.recentContent}>
                <Text style={[styles.recentTitle, { color: colors.text }]}>Team Meeting</Text>
                <Text style={[styles.recentTime, { color: colors.textSecondary }]}>Yesterday • 45 minutes • 🇫🇷 French, 🇩🇪 German</Text>
              </View>
              <TouchableOpacity style={[styles.recentAction, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="repeat-outline" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.recentItem, { borderBottomColor: colors.borderLight }]}>
              <View style={[styles.recentIcon, { backgroundColor: colors.warningLight }]}>
                <Ionicons name="mic" size={20} color={colors.warning} />
              </View>
              <View style={styles.recentContent}>
                <Text style={[styles.recentTitle, { color: colors.text }]}>Voice Call with Alex</Text>
                <Text style={[styles.recentTime, { color: colors.textSecondary }]}>3 days ago • 15 minutes • 🇯🇵 Japanese</Text>
              </View>
              <TouchableOpacity style={[styles.recentAction, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="call-outline" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View
          style={styles.languageBanner}
        >
          <LinearGradient
            colors={colors.gradient3}
            style={styles.languageGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="globe-outline" size={24} color={colors.textInverse} />
            <View style={styles.languageContent}>
              <Text style={[styles.languageTitle, { color: colors.textInverse }]}>30+ Languages Supported</Text>
              <Text style={styles.languageSubtitle}>Real-time translation powered by AI</Text>
            </View>
            <TouchableOpacity style={styles.languageButton}>
              <Ionicons name="arrow-forward" size={16} color={colors.textInverse} />
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  featureToggle: {
    flexDirection: 'row',
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
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  toggleTextActive: {
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
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryActionContent: {
    alignItems: 'center',
  },
  secondaryActionTitle: {
    fontSize: 14,
    fontWeight: '600',
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
    marginTop: 12,
    marginBottom: 4,
  },
  scheduleSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  upcomingMeetings: {
    borderRadius: 16,
    padding: 20,
  },
  upcomingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  meetingCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  meetingDate: {
    fontSize: 12,
    marginTop: 2,
  },
  meetingInfo: {
    flex: 1,
  },
  meetingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  meetingParticipants: {
    fontSize: 14,
  },
  joinEarlyButton: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  joinEarlyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  joinSection: {
    marginBottom: 24,
  },
  joinCard: {
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
    marginLeft: 8,
  },
  inputContainer: {
    marginBottom: 20,
  },
  meetingInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    borderWidth: 2,
  },
  joinMeetingButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinMeetingButtonDisabled: {
  },
  joinMeetingButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  joinMeetingButtonTextDisabled: {
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 20,
    borderWidth: 2,
  },
  inputWrapperFocused: {
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
    paddingVertical: 12,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 2,
  },
  joinButtonDisabled: {
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  joinButtonTextDisabled: {
  },
  joinButtonIcon: {
    marginLeft: 8,
  },
  recentSection: {
    marginBottom: 24,
  },
  recentCard: {
    borderRadius: 16,
    padding: 16,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  recentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    marginBottom: 2,
  },
  recentTime: {
    fontSize: 14,
  },
  recentAction: {
    padding: 8,
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
