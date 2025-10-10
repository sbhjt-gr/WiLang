import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@rneui/themed';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function HistoryScreen() {
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
      case 'outgoing': return '#10b981';
      case 'incoming': return '#667eea';
      case 'missed': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.statGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="time-outline" size={20} color="#ffffff" />
                <Text style={styles.statNumber}>47h</Text>
                <Text style={styles.statLabel}>Total Time</Text>
              </LinearGradient>
            </View>
            
            <View style={styles.statCard}>
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.statGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="call-outline" size={20} color="#ffffff" />
                <Text style={styles.statNumber}>124</Text>
                <Text style={styles.statLabel}>Total Calls</Text>
              </LinearGradient>
            </View>
          </View>
        </View>

        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Recent Calls</Text>
          
          {callHistory.map((call, index) => (
            <View 
              key={call.id}
              style={styles.callCard}
            >
              <View style={styles.callInfo}>
                <View style={[styles.callIcon, { backgroundColor: `${getCallColor(call.type)}20` }]}>
                  <Ionicons 
                    name={getCallIcon(call.type)} 
                    size={20} 
                    color={getCallColor(call.type)}
                    style={call.type === 'incoming' ? { transform: [{ rotate: '180deg' }] } : {}}
                  />
                </View>
                <View style={styles.callDetails}>
                  <Text style={styles.contactName}>{call.contact}</Text>
                  <Text style={styles.callTime}>{call.time}</Text>
                </View>
              </View>
              <View style={styles.callMeta}>
                <Text style={styles.duration}>{call.duration}</Text>
                <TouchableOpacity style={styles.redialButton}>
                  <Ionicons name="videocam-outline" size={16} color="#667eea" />
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
    backgroundColor: '#f8fafc',
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
    overflow: 'hidden',
  },
  statGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 8,
    marginBottom: 4,
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
    color: '#1f2937',
    marginBottom: 16,
  },
  callCard: {
    backgroundColor: '#ffffff',
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
    color: '#1f2937',
    marginBottom: 2,
  },
  callTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  callMeta: {
    alignItems: 'flex-end',
  },
  duration: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  redialButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
  },
});
