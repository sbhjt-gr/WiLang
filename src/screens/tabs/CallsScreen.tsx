import React, { useState, useRef, useCallback, useContext } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Text, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import GlassModal from '../../components/GlassModal';
import { callHistoryService, CallHistoryEntry } from '../../services/CallHistoryService';
import { auth } from '../../config/firebase';
import { useFocusEffect } from '@react-navigation/native';
import { videoCallService } from '../../services/VideoCallService';
import { WebRTCContext } from '../../store/WebRTCContext';

type CallsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'HomeScreen'>;

interface Props {
  navigation: CallsScreenNavigationProp;
}

export default function CallsScreen({ navigation }: Props) {
  const [id, setID] = useState<string>('');
  const textInputRef = useRef<TextInput>(null);
  const { colors } = useTheme();
  const webRTCContext = useContext(WebRTCContext);
  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    icon: string;
  }>({
    visible: false,
    title: '',
    message: '',
    icon: 'information-circle',
  });

  const [callHistory, setCallHistory] = useState<CallHistoryEntry[]>([]);
  const [stats, setStats] = useState({
    totalCalls: 0,
    totalDuration: 0,
    missedCalls: 0,
    completedCalls: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCallHistory = async (forceRefresh: boolean = false) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      const [history, callStats] = await Promise.all([
        callHistoryService.getCallHistory(currentUser.uid, 50, forceRefresh),
        callHistoryService.getCallStats(currentUser.uid),
      ]);

      setCallHistory(history);
      setStats(callStats);
    } catch (error) {
      console.log('load_call_history_failed', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCallHistory(false);
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadCallHistory(true);
  };

  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return '00:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTotalDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m`;
    }
    return `${seconds}s`;
  };

  const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  const handleCall = async (call: CallHistoryEntry, isVoiceOnly: boolean = false) => {
    if (call.contactId && call.contactPhone) {
      try {
        if (!webRTCContext) {
          Alert.alert('Unable to Call', 'Something went wrong. Please restart the app and try again.');
          return;
        }
        videoCallService.setNavigationRef({ current: navigation });

        if (isVoiceOnly) {
          await videoCallService.startVoiceCallWithPhone(
            call.contactId,
            call.contactPhone,
            call.contactName
          );
        } else {
          await videoCallService.startVideoCallWithPhone(
            call.contactId,
            call.contactPhone,
            call.contactName
          );
        }
      } catch {
        Alert.alert('Call Failed', 'Unable to start the call right now. Please try again.');
      }
    } else {
      const meetingId = call.meetingId || `REDIAL_${Date.now()}`;
      const screenName = isVoiceOnly ? 'VoiceCallScreen' : 'VideoCallScreen';
      navigation.navigate(screenName, {
        id: meetingId,
        type: 'instant',
      });
    }
  };

  const showCallOptions = (call: CallHistoryEntry) => {
    if (!call.contactId || !call.contactPhone) {
      handleCall(call, false);
      return;
    }

    Alert.alert(
      call.contactName,
      'Choose call type',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Voice Call', onPress: () => handleCall(call, true) },
        { text: 'Video Call', onPress: () => handleCall(call, false) },
      ]
    );
  };

  const getCallIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'outgoing': return 'call-outline';
      case 'incoming': return 'call-outline';
      case 'missed': return 'call-outline';
      default: return 'call-outline';
    }
  };

  const getCallColor = (type: string) => {
    switch (type) {
      case 'missed': return '#dc2626';
      default: return '#8b5cf6';
    }
  };

  const showModal = (title: string, message: string, icon: string = 'information-circle') => {
    setModalConfig({
      visible: true,
      title,
      message,
      icon,
    });
  };

  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, visible: false }));
  };

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
          showModal("Invalid Code", "Join codes should be 4-8 characters using letters and numbers only.", "alert-circle");
        }
      }
    } else {
      showModal("Missing Meeting ID", "Please enter a valid meeting ID or join code to join the call.", "information-circle");
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />
        }
      >
        <View style={styles.actionsSection}>
          <View style={styles.instantActions}>
            <TouchableOpacity
              style={[styles.primaryActionCard, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
              onPress={createMeeting}
            >
              <Ionicons name="videocam" size={32} color="#8b5cf6" />
              <Text style={[styles.primaryActionTitle, { color: colors.text }]}>Start a meeting</Text>
              <Text style={[styles.primaryActionSubtitle, { color: colors.textSecondary }]}>Begin translating immediately</Text>
            </TouchableOpacity>

            <View style={styles.secondaryActions}>
              <TouchableOpacity
                style={[styles.secondaryActionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => { }}
              >
                <View style={styles.secondaryActionContent}>
                  <Ionicons name="mic" size={24} color="#8b5cf6" />
                  <Text style={[styles.secondaryActionTitle, { color: colors.text }]}>Voice Only</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryActionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => { }}
              >
                <View style={styles.secondaryActionContent}>
                  <Ionicons name="people" size={24} color="#8b5cf6" />
                  <Text style={[styles.secondaryActionTitle, { color: colors.text }]}>Group Call</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
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
              style={[styles.joinMeetingButton, { backgroundColor: colors.surface, borderColor: '#8b5cf6', borderWidth: 1 }, !id.trim() && { borderColor: colors.border }]}
              onPress={meet}
              disabled={!id.trim()}
            >
              <Text style={[styles.joinMeetingButtonText, { color: '#8b5cf6' }, !id.trim() && { color: colors.textTertiary }]}>
                Join Meeting
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
              <Ionicons name="time-outline" size={20} color="#8b5cf6" />
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {formatTotalDuration(stats.totalDuration)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Time</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
              <Ionicons name="call-outline" size={20} color="#8b5cf6" />
              <Text style={[styles.statNumber, { color: colors.text }]}>{stats.totalCalls}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Calls</Text>
            </View>
          </View>
        </View>

        <View style={styles.historySection}>
          <Text style={[styles.historySectionTitle, { color: colors.text }]}>Recent Calls</Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8b5cf6" />
            </View>
          ) : callHistory.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="call-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No call history yet
              </Text>
            </View>
          ) : (
            callHistory.map((call) => (
              <TouchableOpacity
                key={call.id}
                style={[styles.callCard, { backgroundColor: colors.surface }]}
                onPress={() => showCallOptions(call)}
                activeOpacity={0.7}
              >
                <View style={styles.callInfo}>
                  <View style={styles.callIcon}>
                    <Ionicons
                      name={getCallIcon(call.type)}
                      size={20}
                      color={getCallColor(call.type)}
                      style={call.type === 'incoming' ? { transform: [{ rotate: '180deg' }] } : {}}
                    />
                  </View>
                  <View style={styles.callDetails}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.contactName, { color: colors.text }]}>
                        {call.contactName}
                      </Text>
                      {call.encrypted && (
                        <Ionicons name="lock-closed" size={12} color="#10b981" style={styles.encryptedIcon} />
                      )}
                    </View>
                    <Text style={[styles.callTime, { color: colors.textSecondary }]}>
                      {formatTimeAgo(call.timestamp)}
                    </Text>
                  </View>
                </View>
                <View style={styles.callMeta}>
                  <Text style={[styles.duration, { color: colors.textSecondary }]}>
                    {formatDuration(call.duration)}
                  </Text>
                  {call.contactId && call.contactPhone ? (
                    <View style={styles.callButtons}>
                      <TouchableOpacity
                        style={[styles.redialButton, { backgroundColor: colors.primaryLight }]}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleCall(call, true);
                        }}
                      >
                        <Ionicons name="call" size={16} color="#8b5cf6" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.redialButton, { backgroundColor: colors.primaryLight }]}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleCall(call, false);
                        }}
                      >
                        <Ionicons name="videocam" size={16} color="#8b5cf6" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.redialButton, { backgroundColor: colors.primaryLight }]}
                      onPress={() => handleCall(call, false)}
                    >
                      <Ionicons name="videocam" size={16} color="#8b5cf6" />
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <GlassModal
        isVisible={modalConfig.visible}
        onClose={closeModal}
        title={modalConfig.title}
        icon={modalConfig.icon}
        height={250}
      >
        <Text style={[styles.modalMessage, { color: colors.text }]}>
          {modalConfig.message}
        </Text>
        <View style={styles.modalButtons}>
          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: '#8b5cf6' }]}
            onPress={closeModal}
          >
            <Text style={styles.modalButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </GlassModal>
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
  actionsSection: {
    marginBottom: 24,
  },
  instantActions: {
    gap: 16,
  },
  primaryActionCard: {
    borderRadius: 20,
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
  joinMeetingButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statsSection: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  historySection: {
    flex: 1,
  },
  historySectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  callCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  callInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  callIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  callDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  encryptedIcon: {
    marginTop: -2,
  },
  callTime: {
    fontSize: 12,
  },
  callMeta: {
    alignItems: 'flex-end',
    gap: 8,
  },
  duration: {
    fontSize: 12,
  },
  callButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  redialButton: {
    padding: 8,
    borderRadius: 8,
  },
  modalMessage: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
