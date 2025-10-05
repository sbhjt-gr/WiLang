import React, { useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, View, TouchableOpacity, TextInput } from 'react-native';
import { Text } from '@rneui/themed';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/navigation';

type CallsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'HomeScreen'>;

interface Props {
  navigation: CallsScreenNavigationProp;
}

export default function CallsScreen({ navigation }: Props) {
  const [meetingCode, setMeetingCode] = useState('');
  const trimmedMeetingCode = useMemo(() => meetingCode.trim(), [meetingCode]);

  const handleStartCall = () => {
    navigation.navigate('VideoCallScreen', {
      id: 'instant',
      type: 'instant'
    });
  };

  const handleBrowsePeople = () => {
    navigation.navigate('UsersScreen');
  };

  const handleJoinMeeting = () => {
    if (!trimmedMeetingCode) {
      return;
    }

    navigation.navigate('VideoCallScreen', {
      id: trimmedMeetingCode,
      type: 'join',
      joinCode: trimmedMeetingCode
    });
    setMeetingCode('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Calls</Text>
        <Text style={styles.subtitle}>Start a new call or open your directory.</Text>
      </View>
      <View style={styles.actions}>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleStartCall} activeOpacity={0.85}>
            <Text style={styles.primaryButtonText}>Start video call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleBrowsePeople} activeOpacity={0.85}>
            <Text style={styles.secondaryButtonText}>Browse people</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.joinCard}>
          <Text style={styles.joinLabel}>Join with meeting ID</Text>
          <TextInput
            style={styles.joinInput}
            placeholder="Enter meeting ID"
            placeholderTextColor="#6b6f87"
            value={meetingCode}
            onChangeText={setMeetingCode}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.joinButton, !trimmedMeetingCode && styles.joinButtonDisabled]}
            onPress={handleJoinMeeting}
            activeOpacity={0.85}
            disabled={!trimmedMeetingCode}
          >
            <Text style={styles.joinButtonText}>Join meeting</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderTitle}>No recent calls</Text>
        <Text style={styles.placeholderSubtitle}>Calls you join will appear here.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0f',
    paddingHorizontal: 24,
    paddingTop: 24
  },
  header: {
    marginBottom: 24
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f4f5f9',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    color: '#9da3bd'
  },
  actions: {
    marginBottom: 32
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#5560f6',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginRight: 12
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f4f5f9'
  },
  secondaryButton: {
    flex: 1,
    borderColor: '#3c3f55',
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center'
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f4f5f9'
  },
  joinCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1f2337',
    padding: 16,
    backgroundColor: '#111320'
  },
  joinLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f4f5f9',
    marginBottom: 12
  },
  joinInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2d3e',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#f4f5f9',
    marginBottom: 12
  },
  joinButton: {
    borderRadius: 12,
    backgroundColor: '#3d46c4',
    paddingVertical: 12,
    alignItems: 'center'
  },
  joinButtonDisabled: {
    backgroundColor: '#2a2d3e'
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f4f5f9'
  },
  placeholder: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1f2337',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f4f5f9',
    marginBottom: 8
  },
  placeholderSubtitle: {
    fontSize: 13,
    color: '#9da3bd',
    textAlign: 'center'
  }
});
