import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, Platform, Image, Text } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { videoCallService } from '../services/VideoCallService';

interface CallingScreenProps {
  callType: 'outgoing' | 'incoming';
  callerName: string;
  callerPhone?: string;
  callerImage?: string;
  callerId?: string;
  callerSocketId?: string;
  callId?: string;
  meetingId?: string;
  meetingToken?: string;
}

const { width, height } = Dimensions.get('window');

export default function CallingScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as CallingScreenProps;

  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    if (params.callType === 'outgoing') {
      const timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [params.callType]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAccept = () => {
    if (params.callType === 'incoming' && params.callId && params.callerSocketId) {
      videoCallService.acceptIncomingCall(
        params.callId,
        params.callerSocketId,
        params.meetingId,
        params.meetingToken
      );
    }
    (navigation as any).navigate('VideoCallScreen', {
      id: params.meetingId || `call_${params.callerId || Date.now()}`,
      type: 'incoming',
      joinCode: params.meetingId,
      meetingToken: params.meetingToken
    });
  };

  const handleDecline = () => {
    if (params.callType === 'incoming' && params.callId && params.callerSocketId) {
      videoCallService.declineIncomingCall(params.callId, params.callerSocketId);
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      (navigation as any).navigate('HomeScreen');
    }
  };

  const handleCancel = () => {
    videoCallService.cancelOutgoingCall();
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      (navigation as any).navigate('HomeScreen');
    }
  };

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <LinearGradient
        colors={[colors.primary, colors.secondary] as readonly [string, string, ...string[]]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          <View style={styles.statusContainer}>
            <Text style={[styles.statusText, { color: colors.textInverse }]}>
              {params.callType === 'incoming' ? 'Incoming Call' : 'Calling...'}
            </Text>
            {params.callType === 'outgoing' && callDuration > 0 && (
              <Text style={[styles.durationText, { color: colors.textInverse }]}>
                {formatDuration(callDuration)}
              </Text>
            )}
          </View>

          <View style={styles.callerContainer}>
            <MotiView 
              from={{ scale: 1 }}
              animate={{ scale: 1.2 }}
              transition={{
                type: 'timing',
                duration: 1000,
                loop: true,
                repeatReverse: true,
              }}
              style={styles.avatarPulse}
            >
              <View style={styles.avatarOuter}>
                {params.callerImage ? (
                  <Image source={{ uri: params.callerImage }} style={styles.avatarImage} />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: colors.primaryDark }]}>
                    <Text style={[styles.avatarText, { color: colors.textInverse }]}>
                      {getInitials(params.callerName)}
                    </Text>
                  </View>
                )}
              </View>
            </MotiView>

            <Text style={[styles.callerName, { color: colors.textInverse }]}>
              {params.callerName}
            </Text>
            {params.callerPhone && (
              <Text style={[styles.callerPhone, { color: colors.textInverse }]}>
                {params.callerPhone}
              </Text>
            )}
          </View>

          <View style={styles.actionsContainer}>
            {params.callType === 'incoming' ? (
              <View style={styles.incomingActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.declineButton, { backgroundColor: colors.error }]}
                  onPress={handleDecline}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={32} color={colors.textInverse} />
                  <Text style={[styles.actionLabel, { color: colors.textInverse }]}>Decline</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton, { backgroundColor: colors.success }]}
                  onPress={handleAccept}
                  activeOpacity={0.8}
                >
                  <Ionicons name="call" size={32} color={colors.textInverse} />
                  <Text style={[styles.actionLabel, { color: colors.textInverse }]}>Accept</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton, { backgroundColor: colors.error }]}
                onPress={handleCancel}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={32} color={colors.textInverse} />
                <Text style={[styles.actionLabel, { color: colors.textInverse }]}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.hintContainer}>
            <Text style={[styles.hintText, { color: colors.textInverse }]}>
              {params.callType === 'incoming' 
                ? 'Video call with WiLang user'
                : 'Connecting...'}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  statusContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  durationText: {
    fontSize: 16,
    opacity: 0.9,
  },
  callerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  avatarPulse: {
    marginBottom: 30,
  },
  avatarOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  avatar: {
    width: 144,
    height: 144,
    borderRadius: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 144,
    height: 144,
    borderRadius: 72,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '700',
  },
  callerName: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  callerPhone: {
    fontSize: 18,
    opacity: 0.9,
  },
  actionsContainer: {
    paddingHorizontal: 40,
    marginBottom: 40,
  },
  incomingActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 40,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  declineButton: {
    flex: 1,
  },
  acceptButton: {
    flex: 1,
  },
  cancelButton: {
    alignSelf: 'center',
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  hintContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  hintText: {
    fontSize: 14,
    opacity: 0.8,
    textAlign: 'center',
  },
});
