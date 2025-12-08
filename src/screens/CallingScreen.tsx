import React, { useContext, useEffect, useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Image, Text, AppState } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { videoCallService } from '../services/VideoCallService';
import { WebRTCContext } from '../store/WebRTCContext';
import { callKeepService } from '../services/callkeep-service';
import RNCallKeep from 'react-native-callkeep';

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
  fromPush?: boolean;
}

export default function CallingScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as CallingScreenProps;
  const webRTCContext = useContext(WebRTCContext);

  const [callDuration, setCallDuration] = useState(0);
  const [callState, setCallState] = useState<'ringing' | 'connecting' | 'connected' | 'ended'>('ringing');
  const callUUID = useRef<string>(params.callId || `call_${Date.now()}`);

  useEffect(() => {
    const initNativeCall = async () => {
      await callKeepService.init();
      
      if (params.callType === 'incoming' && !params.fromPush) {
        if (Platform.OS === 'android') {
          RNCallKeep.displayIncomingCall(
            callUUID.current,
            params.callerPhone || params.callerName,
            params.callerName,
            'generic',
            true
          );
        }
      } else if (params.callType === 'outgoing') {
        RNCallKeep.startCall(
          callUUID.current,
          params.callerPhone || params.callerName,
          params.callerName,
          'generic',
          true
        );
      }
    };

    initNativeCall();

    return () => {
      RNCallKeep.endCall(callUUID.current);
    };
  }, []);

  useEffect(() => {
    if (params.callType === 'outgoing') {
      const timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [params.callType]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' && params.callType === 'incoming') {
        console.log('call_backgrounded');
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    callKeepService.setOnAnswerCall(() => {
      handleAccept();
    });

    callKeepService.setOnEndCall(() => {
      handleDecline();
    });

    return () => {
      callKeepService.setOnAnswerCall(() => {});
      callKeepService.setOnEndCall(() => {});
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAccept = async () => {
    setCallState('connecting');

    if (params.callType === 'incoming' && params.callId && params.callerSocketId) {
      webRTCContext?.prepareDirectCall?.({
        peerId: params.callerSocketId,
        userId: params.callerId,
        username: params.callerName,
        phoneNumber: params.callerPhone,
        role: 'recipient',
      });
      videoCallService.acceptIncomingCall(
        params.callId,
        params.callerSocketId,
        params.meetingId,
        params.meetingToken
      );
    }

    RNCallKeep.setCurrentCallActive(callUUID.current);

    (navigation as any).replace('VideoCallScreen', {
      id: params.meetingId || `call_${params.callerId || Date.now()}`,
      type: 'incoming',
      joinCode: params.meetingId,
      meetingToken: params.meetingToken
    });
  };

  const handleDecline = () => {
    setCallState('ended');

    if (params.callType === 'incoming' && params.callId && params.callerSocketId) {
      videoCallService.declineIncomingCall(params.callId, params.callerSocketId);
    }

    RNCallKeep.endCall(callUUID.current);

    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      (navigation as any).replace('HomeScreen');
    }
  };

  const handleCancel = () => {
    setCallState('ended');

    videoCallService.cancelOutgoingCall();
    RNCallKeep.endCall(callUUID.current);

    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      (navigation as any).replace('HomeScreen');
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
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
              {params.callType === 'incoming' 
                ? (callState === 'ringing' ? 'Incoming Video Call' : 'Connecting...')
                : 'Calling...'}
            </Text>
            {params.callType === 'outgoing' && callDuration > 0 && (
              <Text style={[styles.durationText, { color: colors.textInverse }]}>
                {formatDuration(callDuration)}
              </Text>
            )}
          </View>

          <View style={styles.callerContainer}>
            <MotiView 
              from={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: 1.15, opacity: 1 }}
              transition={{
                type: 'timing',
                duration: 1200,
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
              {params.callerName || 'Unknown'}
            </Text>
            {params.callerPhone && (
              <Text style={[styles.callerPhone, { color: colors.textInverse }]}>
                {params.callerPhone}
              </Text>
            )}

            {params.callType === 'incoming' && (
              <View style={styles.callTypeIndicator}>
                <Ionicons name="videocam" size={20} color={colors.textInverse} />
                <Text style={[styles.callTypeText, { color: colors.textInverse }]}>
                  Video Call
                </Text>
              </View>
            )}
          </View>

          <View style={styles.actionsContainer}>
            {params.callType === 'incoming' ? (
              <View style={styles.incomingActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleDecline}
                  activeOpacity={0.8}
                >
                  <View style={[styles.buttonInner, { backgroundColor: '#FF3B30' }]}>
                    <Ionicons name="close" size={36} color="#FFF" />
                  </View>
                  <Text style={[styles.actionLabel, { color: colors.textInverse }]}>Decline</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleAccept}
                  activeOpacity={0.8}
                >
                  <MotiView
                    from={{ scale: 1 }}
                    animate={{ scale: 1.1 }}
                    transition={{
                      type: 'timing',
                      duration: 800,
                      loop: true,
                      repeatReverse: true,
                    }}
                  >
                    <View style={[styles.buttonInner, { backgroundColor: '#34C759' }]}>
                      <Ionicons name="videocam" size={36} color="#FFF" />
                    </View>
                  </MotiView>
                  <Text style={[styles.actionLabel, { color: colors.textInverse }]}>Accept</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={handleCancel}
                activeOpacity={0.8}
              >
                <View style={[styles.buttonInner, { backgroundColor: '#FF3B30' }]}>
                  <Ionicons name="call" size={36} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
                </View>
                <Text style={[styles.actionLabel, { color: colors.textInverse }]}>End Call</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.hintContainer}>
            <Text style={[styles.hintText, { color: colors.textInverse }]}>
              {params.callType === 'incoming' 
                ? 'Swipe up or tap Accept to answer'
                : 'Waiting for answer...'}
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
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.5,
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
    marginBottom: 16,
  },
  callTypeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  callTypeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionsContainer: {
    paddingHorizontal: 40,
    marginBottom: 40,
  },
  incomingActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cancelButton: {
    alignSelf: 'center',
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  hintContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  hintText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
});
