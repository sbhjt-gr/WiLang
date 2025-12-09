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
  const [joinCode, setJoinCode] = useState<string>('');
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

  const formatTotalDuration = (seconds: number | null | undefined): string => {
    if (seconds == null || seconds === 0) return '0s';
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
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

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
      navigation.reset({
        index: 0,
        routes: [{ name: screenName, params: { id: meetingId, type: 'instant' } }],
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

  const getCallColor = (type: string) => {
    switch (type) {
      case 'missed': return '#ef4444';
      case 'incoming': return '#10b981';
      case 'outgoing': return '#8b5cf6';
      default: return '#8b5cf6';
    }
  };

  const getCallTypeIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'missed': return 'arrow-down-outline';
      case 'incoming': return 'arrow-down-outline';
      case 'outgoing': return 'arrow-up-outline';
      default: return 'call-outline';
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

  const handleJoinMeeting = (): void => {
    if (joinCode.trim()) {
      const rawInput = joinCode.trim();
      const isOnlyNumeric = /^[0-9]+$/.test(rawInput);
      const numericId = parseInt(rawInput);
      if (isOnlyNumeric && !isNaN(numericId)) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'VideoCallScreen', params: { id: numericId.toString(), type: 'join', joinCode: numericId.toString() } }],
        });
      } else {
        const cleanCode = rawInput.toUpperCase();

        if (/^[A-Z0-9]{4,8}$/.test(cleanCode)) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'VideoCallScreen', params: { id: Date.now().toString(), type: 'join', joinCode: cleanCode } }],
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
    navigation.reset({
      index: 0,
      routes: [{ name: 'VideoCallScreen', params: { id: meetingId, type: 'instant' } }],
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />
        }
      >
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.startCallBtn}
            onPress={createMeeting}
            activeOpacity={0.85}
          >
            <View style={styles.startCallIcon}>
              <Ionicons name="videocam" size={24} color="#ffffff" />
            </View>
            <View style={styles.startCallText}>
              <Text style={styles.startCallTitle}>New Meeting</Text>
              <Text style={styles.startCallSubtitle}>Start a video call</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <View style={styles.joinRow}>
            <View style={[styles.joinInputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="keypad-outline" size={18} color={colors.textTertiary} />
              <TextInput
                ref={textInputRef}
                style={[styles.joinInput, { color: colors.text }]}
                placeholder="Enter code"
                placeholderTextColor={colors.textTertiary}
                value={joinCode}
                onChangeText={setJoinCode}
                autoCapitalize="characters"
                autoCorrect={false}
                autoComplete="off"
                returnKeyType="join"
                onSubmitEditing={handleJoinMeeting}
              />
            </View>
            <TouchableOpacity
              style={[styles.joinBtn, !joinCode.trim() && styles.joinBtnDisabled]}
              onPress={handleJoinMeeting}
              disabled={!joinCode.trim()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-forward" size={20} color={joinCode.trim() ? '#ffffff' : colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statPill, { backgroundColor: colors.surface }]}>
            <Ionicons name="time-outline" size={16} color="#8b5cf6" />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatTotalDuration(stats.totalDuration)}
            </Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: colors.surface }]}>
            <Ionicons name="call-outline" size={16} color="#8b5cf6" />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats.totalCalls} calls
            </Text>
          </View>
        </View>

        <View style={styles.historySection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent</Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#8b5cf6" />
            </View>
          ) : callHistory.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconContainer, { backgroundColor: colors.surface }]}>
                <Ionicons name="call-outline" size={32} color={colors.textTertiary} />
              </View>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No calls yet
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                Start a meeting or call a contact
              </Text>
            </View>
          ) : (
            <View style={[styles.historyList, { backgroundColor: colors.surface }]}>
              {callHistory.map((call, index) => (
                <TouchableOpacity
                  key={call.id}
                  style={[
                    styles.callItem,
                    index !== callHistory.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }
                  ]}
                  onPress={() => showCallOptions(call)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.callAvatar, { backgroundColor: getCallColor(call.type) + '20' }]}>
                    <Ionicons
                      name={getCallTypeIcon(call.type)}
                      size={18}
                      color={getCallColor(call.type)}
                      style={{ transform: [{ rotate: call.type === 'outgoing' ? '45deg' : call.type === 'missed' ? '135deg' : '-45deg' }] }}
                    />
                  </View>
                  <View style={styles.callInfo}>
                    <Text style={[styles.callName, { color: colors.text }]} numberOfLines={1}>
                      {call.contactName}
                    </Text>
                    <View style={styles.callMetaRow}>
                      <Text style={[styles.callTypeLabel, { color: getCallColor(call.type) }]}>
                        {call.type === 'outgoing' ? 'Outgoing' : call.type === 'incoming' ? 'Incoming' : 'Missed'}
                      </Text>
                      <Text style={[styles.callMeta, { color: colors.textSecondary }]}>
                        · {formatTimeAgo(call.timestamp)} · {formatDuration(call.duration)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.callActions}>
                    {call.contactId && call.contactPhone ? (
                      <>
                        <TouchableOpacity
                          style={[styles.callActionBtn, { backgroundColor: colors.primaryLight }]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleCall(call, true);
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="call" size={16} color="#8b5cf6" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.callActionBtn, { backgroundColor: colors.primaryLight }]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleCall(call, false);
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="videocam" size={16} color="#8b5cf6" />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity
                        style={[styles.callActionBtn, { backgroundColor: colors.primaryLight }]}
                        onPress={() => handleCall(call, false)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="videocam" size={16} color="#8b5cf6" />
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
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
            style={styles.modalButton}
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
    padding: 16,
    paddingTop: 20,
  },
  quickActions: {
    marginBottom: 20,
  },
  startCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    borderRadius: 20,
    paddingVertical: 30,
    paddingHorizontal: 18,
    marginTop: 8,
    marginBottom: 20,
  },
  startCallIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startCallText: {
    flex: 1,
    marginLeft: 14,
  },
  startCallTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
  },
  startCallSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  joinRow: {
    flexDirection: 'row',
    gap: 10,
  },
  joinInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    height: 48,
    gap: 10,
  },
  joinInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  joinBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinBtnDisabled: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 8,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  historySection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.7,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  historyList: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  callItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  callAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callInfo: {
    flex: 1,
    marginLeft: 12,
  },
  callName: {
    fontSize: 15,
    fontWeight: '600',
  },
  callMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  callTypeLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  callMeta: {
    fontSize: 12,
  },
  callActions: {
    flexDirection: 'row',
    gap: 8,
  },
  callActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalMessage: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#8b5cf6',
    minWidth: 80,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
