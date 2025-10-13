import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@rneui/themed';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

export default function HistoryScreen() {
  const { colors } = useTheme();
  const callHistory = [
    { 
      id: 1, 
      contact: 'John Doe', 
      type: 'outgoing', 
      duration: '15:30', 
      time: '2 hours ago',
      status: 'completed'
    },
    { 
      id: 2, 
      contact: 'Jane Smith', 
      type: 'incoming', 
      duration: '08:45', 
      time: '4 hours ago',
      status: 'completed'
    },
    { 
      id: 3, 
      contact: 'Mike Johnson', 
      type: 'missed', 
      duration: '00:00', 
      time: '1 day ago',
      status: 'missed'
    },
    { 
      id: 4, 
      contact: 'Sarah Wilson', 
      type: 'outgoing', 
      duration: '22:15', 
      time: '2 days ago',
      status: 'completed'
    },
  ];

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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#8b5cf6' }]}>
              <Ionicons name="time-outline" size={20} color="#ffffff" />
              <Text style={styles.statNumber}>47h</Text>
              <Text style={styles.statLabel}>Total Time</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#8b5cf6' }]}>
              <Ionicons name="call-outline" size={20} color="#ffffff" />
              <Text style={styles.statNumber}>124</Text>
              <Text style={styles.statLabel}>Total Calls</Text>
            </View>
          </View>
        </View>

        <View style={styles.historySection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Calls</Text>

          {callHistory.map((call, index) => (
            <View
              key={call.id}
              style={[styles.callCard, { backgroundColor: colors.surface }]}
            >
              <View style={styles.callInfo}>
                <View style={[styles.callIcon, { backgroundColor: call.type === 'missed' ? 'rgba(220, 38, 38, 0.15)' : 'rgba(139, 92, 246, 0.15)' }]}>
                  <Ionicons
                    name={getCallIcon(call.type)}
                    size={20}
                    color={getCallColor(call.type)}
                    style={call.type === 'incoming' ? { transform: [{ rotate: '180deg' }] } : {}}
                  />
                </View>
                <View style={styles.callDetails}>
                  <Text style={[styles.contactName, { color: colors.text }]}>{call.contact}</Text>
                  <Text style={[styles.callTime, { color: colors.textSecondary }]}>{call.time}</Text>
                </View>
              </View>
              <View style={styles.callMeta}>
                <Text style={[styles.duration, { color: colors.textSecondary }]}>{call.duration}</Text>
                <TouchableOpacity style={[styles.redialButton, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                  <Ionicons name="videocam-outline" size={16} color="#8b5cf6" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
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
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
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
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  callTime: {
    fontSize: 12,
  },
  callMeta: {
    alignItems: 'flex-end',
  },
  duration: {
    fontSize: 12,
    marginBottom: 4,
  },
  redialButton: {
    padding: 6,
    borderRadius: 6,
  },
});
