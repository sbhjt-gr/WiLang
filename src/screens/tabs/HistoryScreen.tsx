import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { callHistoryService, CallHistoryEntry } from '../../services/CallHistoryService';
import { auth } from '../../config/firebase';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/navigation';

type HistoryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'HomeScreen'>;

export default function HistoryScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<HistoryScreenNavigationProp>();
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

  const handleCall = (call: CallHistoryEntry) => {
    if (call.contactId || call.contactPhone) {
      navigation.navigate('CallingScreen', {
        callType: 'outgoing',
        callerName: call.contactName,
        callerPhone: call.contactPhone,
        callerId: call.contactId,
      });
    } else {
      const meetingId = call.meetingId || `REDIAL_${Date.now()}`;
      navigation.navigate('VideoCallScreen', {
        id: meetingId,
        type: 'instant',
      });
    }
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />
          }
        >
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
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Calls</Text>

            {callHistory.length === 0 ? (
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
                  onPress={() => handleCall(call)}
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
                    <TouchableOpacity
                      style={[styles.redialButton, { backgroundColor: colors.primaryLight }]}
                      onPress={() => handleCall(call)}
                    >
                      <Ionicons name="call" size={18} color="#8b5cf6" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  statsSection: {
    marginBottom: 32,
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
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
  redialButton: {
    padding: 8,
    borderRadius: 8,
  },
});
