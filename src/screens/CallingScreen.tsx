import React, { useContext, useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Image, Text, TouchableOpacity } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { videoCallService } from '../services/VideoCallService';
import { WebRTCContext } from '../store/WebRTCContext';
import InCallManager from 'react-native-incall-manager';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  runOnJS,
  interpolateColor,
  withRepeat,
  withTiming,
  Easing
} from 'react-native-reanimated';

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
  isVoiceOnly?: boolean;
}

const { width } = Dimensions.get('window');
const SLIDER_WIDTH = width - 80;
const KNOB_SIZE = 70;
const MAX_SLIDE = (SLIDER_WIDTH - KNOB_SIZE) / 2 - 5;

export default function CallingScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as CallingScreenProps;
  const webRTCContext = useContext(WebRTCContext);

  const [callDuration, setCallDuration] = useState(0);
  
  const translateX = useSharedValue(0);
  const arrowOpacity = useSharedValue(0);

  useEffect(() => {
    arrowOpacity.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    console.log('call_type', params.callType);
    if (params.callType === 'incoming') {
      InCallManager.startRingtone('_DEFAULT_', [0, 500, 200, 500], 'playback', 60);
    }

    return () => {
      InCallManager.stopRingtone();
      InCallManager.stop();
    };
  }, [params.callType]);

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

  const stopRingtone = () => {
    InCallManager.stopRingtone();
  };

  const handleAccept = () => {
    stopRingtone();
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
    
    const screenName = params.isVoiceOnly ? 'VoiceCallScreen' : 'VideoCallScreen';
    (navigation as any).navigate(screenName, {
      id: params.meetingId || `call_${params.callerId || Date.now()}`,
      type: 'incoming',
      joinCode: params.meetingId,
      meetingToken: params.meetingToken,
      callerName: params.callerName
    });
  };

  const handleDecline = () => {
    stopRingtone();
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
    stopRingtone();
    videoCallService.cancelOutgoingCall();
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      (navigation as any).navigate('HomeScreen');
    }
  };

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = Math.max(-MAX_SLIDE, Math.min(e.translationX, MAX_SLIDE));
    })
    .onEnd(() => {
      if (translateX.value > MAX_SLIDE * 0.7) {
        translateX.value = withSpring(MAX_SLIDE);
        runOnJS(handleAccept)();
      } else if (translateX.value < -MAX_SLIDE * 0.7) {
        translateX.value = withSpring(-MAX_SLIDE);
        runOnJS(handleDecline)();
      } else {
        translateX.value = withSpring(0);
      }
    });

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      translateX.value,
      [-MAX_SLIDE, 0, MAX_SLIDE],
      ['rgba(255,59,48,0.3)', 'rgba(255,255,255,0.15)', 'rgba(76,217,100,0.3)']
    ),
  }));

  const leftArrowStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < 0 ? 0 : arrowOpacity.value * (1 - translateX.value / MAX_SLIDE),
  }));

  const rightArrowStyle = useAnimatedStyle(() => ({
    opacity: translateX.value > 0 ? 0 : arrowOpacity.value * (1 + translateX.value / MAX_SLIDE),
  }));

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <GestureHandlerRootView style={styles.container}>
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
                animate={{ scale: 1.15 }}
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
                <View style={styles.sliderContainer}>
                  <Animated.View style={[styles.sliderTrack, trackStyle]}>
                    <View style={styles.iconsRow}>
                      <View style={styles.iconLeft}>
                        <Ionicons name="call" size={24} color="rgba(255,59,48,0.8)" style={{ transform: [{ rotate: '135deg' }] }} />
                      </View>
                      
                      <Animated.View style={[styles.arrowsLeft, leftArrowStyle]}>
                        <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.4)" />
                        <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.6)" style={{ marginLeft: -6 }} />
                      </Animated.View>

                      <GestureDetector gesture={panGesture}>
                        <Animated.View style={[styles.knob, knobStyle]}>
                          <Ionicons name="call" size={28} color="#fff" />
                        </Animated.View>
                      </GestureDetector>

                      <Animated.View style={[styles.arrowsRight, rightArrowStyle]}>
                        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
                        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.4)" style={{ marginLeft: -6 }} />
                      </Animated.View>

                      <View style={styles.iconRight}>
                        <Ionicons name="call" size={24} color="rgba(76,217,100,0.8)" />
                      </View>
                    </View>
                  </Animated.View>
                  <Text style={styles.hintLabel}>Swipe to answer or decline</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.cancelButton, { backgroundColor: colors.error }]}
                  onPress={handleCancel}
                  activeOpacity={0.8}
                >
                  <Ionicons name="call" size={24} color={colors.textInverse} style={{ transform: [{ rotate: '135deg' }] }} />
                  <Text style={[styles.cancelLabel, { color: colors.textInverse }]}>End Call</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.hintContainer}>
              <Text style={[styles.hintText, { color: colors.textInverse }]}>
                {params.callType === 'incoming' 
                  ? (params.isVoiceOnly ? 'Voice call' : 'Video call')
                  : 'Connecting...'}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </SafeAreaView>
    </GestureHandlerRootView>
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
  sliderContainer: {
    alignItems: 'center',
  },
  sliderTrack: {
    width: SLIDER_WIDTH,
    height: KNOB_SIZE + 10,
    borderRadius: (KNOB_SIZE + 10) / 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
  },
  iconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  iconLeft: {
    position: 'absolute',
    left: 20,
  },
  iconRight: {
    position: 'absolute',
    right: 20,
  },
  arrowsLeft: {
    flexDirection: 'row',
    position: 'absolute',
    left: 55,
  },
  arrowsRight: {
    flexDirection: 'row',
    position: 'absolute',
    right: 55,
  },
  knob: {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    backgroundColor: '#4CD964',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  hintLabel: {
    marginTop: 12,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 100,
    height: 70,
    borderRadius: 28,
    alignSelf: 'center',
    gap: 8,
    shadowColor: '#000',
    elevation: 2,
  },
  cancelLabel: {
    fontSize: 16,
    fontWeight: '600',
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
