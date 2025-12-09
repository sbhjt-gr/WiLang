import React, { useContext, useLayoutEffect, useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { RTCView } from '@livekit/react-native-webrtc';
import { StatusBar } from 'expo-status-bar';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { auth } from "../config/firebase";
import { RootStackParamList } from '../types/navigation';
import { WebRTCContext } from '../store/WebRTCContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import GlassModal from '../components/GlassModal';
import { useTheme } from '../theme';
import TranslationControls from '../components/translation-controls';
import TranscriptionOverlay from '../components/transcription-overlay';
import { VideoCallTranslation, type TranslationState } from '../services/video-call-translation';
import { CallTranslationPrefs } from '../services/call-translation-prefs';
import type { SourceLangCode, TargetLangCode } from '../services/palabra/types';

const { width, height } = Dimensions.get('window');

type VoiceCallScreenNavigationProp = StackNavigationProp<RootStackParamList, 'VoiceCallScreen'>;
type VoiceCallScreenRouteProp = RouteProp<RootStackParamList, 'VoiceCallScreen'>;

interface Props {
  navigation: VoiceCallScreenNavigationProp;
  route: VoiceCallScreenRouteProp;
}

export default function VoiceCallScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const {
    localStream,
    remoteStream,
    remoteStreams,
    activeCall,
    remoteUser,
    participants,
    isMuted,
    closeCall,
    toggleMute,
    initialize,
    createMeeting,
    joinMeeting,
    currentMeetingId,
    peerId,
    setUsername,
    createMeetingWithSocket,
    e2eStatus,
    getSecurityCode,
    pendingJoinRequests,
    approveJoinRequest,
    denyJoinRequest,
    awaitingHostApproval,
    joinDeniedReason,
    acknowledgeJoinDenied,
    isMeetingOwner,
    replaceAudioTrack,
    restoreOriginalAudio,
    isDirectCallActive,
  } = useContext(WebRTCContext);

  const [isDirectCall, setIsDirectCall] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSecurityCodeModal, setShowSecurityCodeModal] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    icon: string;
    buttons: Array<{ text: string; onPress?: () => void }>;
  }>({
    visible: false,
    title: '',
    message: '',
    icon: 'information-circle',
    buttons: [],
  });

  const [palabraEnabled, setPalabraEnabled] = useState(false);
  const [palabraState, setPalabraState] = useState<TranslationState>('idle');
  const [palabraSource, setPalabraSource] = useState<SourceLangCode>('auto');
  const [palabraTarget, setPalabraTarget] = useState<TargetLangCode>('en-us');
  const [palabraTranscript, setPalabraTranscript] = useState<string | null>(null);
  const [palabraTranslation, setPalabraTranslation] = useState<string | null>(null);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const palabraServiceRef = useRef<VideoCallTranslation | null>(null);

  const initializationAttempted = useRef(false);
  const joinAttempted = useRef(false);
  const callStartTime = useRef<number | null>(null);

  const showModal = useCallback((title: string, message: string, icon: string = 'information-circle', buttons: Array<{ text: string; onPress?: () => void }> = [{ text: 'OK' }]) => {
    setModalConfig({
      visible: true,
      title,
      message,
      icon,
      buttons,
    });
  }, []);

  const closeModal = useCallback(() => {
    setModalConfig(prev => ({ ...prev, visible: false }));
  }, []);

  const shareJoinCode = useCallback(async () => {
    if (!currentMeetingId) {
      showModal('Please wait', 'Call code is still being generated.', 'time');
      return;
    }

    try {
      const message = `Join my WiLang voice call!\n\nJoin Code: ${currentMeetingId}\n\nDownload WiLang and enter this code to join the call with real-time translation.`;

      await Share.share({
        message,
        title: 'Join My Voice Call',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      showModal('Error', `Unable to share join code: ${message}`, 'alert-circle');
    }
  }, [currentMeetingId, showModal]);

  const copyJoinCode = useCallback(() => {
    if (!currentMeetingId) {
      showModal('Please wait', 'Call code is still being generated.', 'time');
      return;
    }

    Clipboard.setStringAsync(currentMeetingId);
    showModal('Copied!', 'Join code copied to clipboard', 'checkmark-circle');
  }, [currentMeetingId, showModal]);

  const toggleSecurityCodeModal = useCallback(() => {
    setShowSecurityCodeModal(prev => !prev);
  }, []);

  const pendingJoinRequest = pendingJoinRequests?.[0];
  const pendingJoinRequestId = pendingJoinRequest?.requestId;

  const handleApproveJoinRequest = useCallback(() => {
    if (pendingJoinRequestId) {
      approveJoinRequest?.(pendingJoinRequestId);
    }
  }, [approveJoinRequest, pendingJoinRequestId]);

  const handleDenyJoinRequest = useCallback(() => {
    if (pendingJoinRequestId) {
      denyJoinRequest?.(pendingJoinRequestId);
    }
  }, [denyJoinRequest, pendingJoinRequestId]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    if (route.params?.type === 'join' && route.params?.joinCode && !joinAttempted.current) {
      joinAttempted.current = true;
    }
  }, [route.params?.type, route.params?.joinCode, route.params?.autoJoinHandled]);

  const remotePeers = useMemo(
    () => (participants || []).filter(p => !p.isLocal && p.peerId !== peerId),
    [participants, peerId],
  );

  useEffect(() => {
    if (remotePeers.length > 0 && !isConnected) {
      setIsConnected(true);
      callStartTime.current = Date.now();
    }
  }, [remotePeers.length, isConnected]);

  useEffect(() => {
    if (!isConnected) return;

    const timer = setInterval(() => {
      if (callStartTime.current) {
        setCallDuration(Math.floor((Date.now() - callStartTime.current) / 1000));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isConnected]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    let active = true;
    const loadPalabraPrefs = async () => {
      try {
        const [enabled, source, target] = await Promise.all([
          CallTranslationPrefs.isEnabled(),
          CallTranslationPrefs.getSource(),
          CallTranslationPrefs.getTarget(),
        ]);
        if (active) {
          setPalabraEnabled(enabled);
          setPalabraSource(source);
          setPalabraTarget(target);
        }
      } catch (error) {
        console.warn('[Palabra] Failed to load prefs:', error);
      }
    };
    loadPalabraPrefs();
    return () => {
      active = false;
    };
  }, []);

  const replaceAudioTrackRef = useRef(replaceAudioTrack);
  const restoreOriginalAudioRef = useRef(restoreOriginalAudio);

  useEffect(() => {
    replaceAudioTrackRef.current = replaceAudioTrack;
    restoreOriginalAudioRef.current = restoreOriginalAudio;
  });

  useEffect(() => {
    if (!palabraEnabled) {
      if (palabraServiceRef.current) {
        palabraServiceRef.current.stop();
        palabraServiceRef.current = null;
        setPalabraState('idle');
        setPalabraTranscript(null);
        setPalabraTranslation(null);
        restoreOriginalAudioRef.current?.();
      }
      return;
    }

    let service = palabraServiceRef.current;

    if (!service) {
      service = new VideoCallTranslation();
      palabraServiceRef.current = service;
    }

    service.setLanguages(palabraSource, palabraTarget);

    const handleStateChange = (state: TranslationState) => {
      console.log('palabra_state', state);
      setPalabraState(state);
    };

    const handleTranscription = (data: { text: string; isFinal?: boolean }) => {
      console.log('palabra_transcription', data.isFinal);
      setPalabraTranscript(data.text);
    };

    const handleTranslation = (data: { text: string; isFinal?: boolean }) => {
      console.log('palabra_translation', data.isFinal);
      setPalabraTranslation(data.text);
    };

    const handleRemoteTrack = (tracks: Array<{ track: MediaStreamTrack }>) => {
      if (tracks.length > 0) {
        const translatedTrack = tracks[0].track;
        console.log('replacing_with_translated_track');
        replaceAudioTrackRef.current?.(translatedTrack).then((success) => {
          console.log('track_replaced', success);
        });
      }
    };

    const handleError = (err: Error) => {
      console.log('palabra_err', err.message);
      showModal('Translation Error', err.message || 'An error occurred', 'alert-circle');
    };

    service.on('stateChange', handleStateChange);
    service.on('transcription', handleTranscription);
    service.on('translation', handleTranslation);
    service.on('remoteTrack', handleRemoteTrack);
    service.on('error', handleError);

    return () => {
      service.off('stateChange', handleStateChange);
      service.off('transcription', handleTranscription);
      service.off('translation', handleTranslation);
      service.off('remoteTrack', handleRemoteTrack);
      service.off('error', handleError);
    };
  }, [palabraEnabled, palabraSource, palabraTarget, showModal]);

  useEffect(() => {
    if (!palabraEnabled || !palabraServiceRef.current) {
      return;
    }

    const service = palabraServiceRef.current;
    if (service.getState() !== 'idle') {
      return;
    }

    console.log('palabra_starting');
    service.start().catch((err) => {
      console.log('palabra_start_failed', err);
    });
  }, [palabraEnabled]);

  useEffect(() => {
    return () => {
      if (palabraServiceRef.current) {
        palabraServiceRef.current.stop();
        palabraServiceRef.current = null;
      }
      restoreOriginalAudioRef.current?.();
    };
  }, []);

  useEffect(() => {
    CallTranslationPrefs.setEnabled(palabraEnabled);
  }, [palabraEnabled]);

  useEffect(() => {
    CallTranslationPrefs.setSource(palabraSource);
    if (palabraServiceRef.current && palabraEnabled) {
      palabraServiceRef.current.setLanguages(palabraSource, palabraTarget);
    }
  }, [palabraSource, palabraTarget, palabraEnabled]);

  useEffect(() => {
    CallTranslationPrefs.setTarget(palabraTarget);
  }, [palabraTarget]);

  const handlePalabraToggle = useCallback(() => {
    setPalabraEnabled((prev) => !prev);
  }, []);

  const handleSubtitlesToggle = useCallback(() => {
    setSubtitlesEnabled((prev) => !prev);
  }, []);

  const handleSpeakerToggle = useCallback(() => {
    setIsSpeakerOn((prev) => !prev);
    // TODO: Implement actual speaker mode toggle functionality
    // This would typically involve audio routing to speaker/earpiece
  }, []);

  const handleCloseCall = useCallback(async () => {
    try {
      if (palabraServiceRef.current) {
        await palabraServiceRef.current.stop();
        palabraServiceRef.current = null;
      }
      await restoreOriginalAudioRef.current?.();
      setPalabraEnabled(false);
      setPalabraState('idle');
      setPalabraTranscript(null);
      setPalabraTranslation(null);

      closeCall();
    } catch (err) {
      console.log('call_cleanup_err', err);
    } finally {
      navigation.reset({ index: 0, routes: [{ name: 'HomeScreen' }] });
    }
  }, [closeCall, navigation]);

  const hadRemotePeersRef = useRef(false);
  const disconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const remotePeersLengthRef = useRef(0);

  useEffect(() => {
    remotePeersLengthRef.current = remotePeers.length;
    if (remotePeers.length > 0) {
      hadRemotePeersRef.current = true;
      if (disconnectTimeoutRef.current) {
        clearTimeout(disconnectTimeoutRef.current);
        disconnectTimeoutRef.current = null;
      }
    }
  }, [remotePeers.length]);

  useEffect(() => {
    if (hadRemotePeersRef.current && remotePeers.length === 0) {
      disconnectTimeoutRef.current = setTimeout(() => {
        if (remotePeersLengthRef.current === 0) {
          handleCloseCall();
        }
      }, 3000);
    }
    return () => {
      if (disconnectTimeoutRef.current) {
        clearTimeout(disconnectTimeoutRef.current);
      }
    };
  }, [remotePeers.length, handleCloseCall]);

  const handleJoinDeniedClose = useCallback(async () => {
    acknowledgeJoinDenied?.();
    try {
      if (palabraServiceRef.current) {
        await palabraServiceRef.current.stop();
        palabraServiceRef.current = null;
      }
      await restoreOriginalAudioRef.current?.();
      setPalabraEnabled(false);

      closeCall();
    } catch (err) {
      console.log('denied_cleanup_err', err);
    } finally {
      navigation.goBack();
    }
  }, [acknowledgeJoinDenied, closeCall, navigation]);

  useEffect(() => {
    if (initializationAttempted.current) {
      return;
    }

    initializationAttempted.current = true;

    const initializeCall = async () => {
      const currentUser = auth.currentUser;
      const username = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';

      try {
        let socketConnection = null;
        if (!localStream || (route.params?.type === 'join' && !currentMeetingId) || route.params?.type === 'incoming' || route.params?.type === 'outgoing') {
          const initResult = await initialize(username);
          socketConnection = initResult.socket || initResult;
          if (!localStream && !initResult.localStream) {
            throw new Error('Failed to obtain local media stream after initialization');
          }
        }
        if (route.params?.type === 'join' || route.params?.type === 'incoming' || route.params?.type === 'outgoing') {
          if (joinAttempted.current) {
            if (!currentMeetingId) {
              joinAttempted.current = false;
            } else {
              return;
            }
          }

          if (route.params?.type === 'incoming' || route.params?.type === 'outgoing') {
            setIsDirectCall(true);
          }

          joinAttempted.current = true;

          const meetingId = route.params?.joinCode || route.params?.id;
          const meetingToken = route.params?.meetingToken;

          if (route.params?.autoJoinHandled && currentMeetingId === meetingId) {
            console.log('join_skipped_auto', { meetingId });
            return;
          }

          if (!meetingId) {
            showModal('Error', 'No call ID provided to join.', 'alert-circle', [
              { text: 'OK', onPress: () => { closeModal(); navigation.goBack(); } }
            ]);
            return;
          }

          const userId = currentUser?.uid;

          console.log('attempting_join', {
            meetingId,
            hasToken: !!meetingToken,
            hasUserId: !!userId,
            socketConnected: socketConnection?.connected
          });

          let joined = false;

          try {
            joined = await joinMeeting(
              meetingId,
              socketConnection,
              meetingToken,
              userId
            );

            console.log('join_result', joined);
          } catch (joinError) {
            const errorMessage = joinError instanceof Error
              ? joinError.message
              : typeof joinError === 'string'
                ? joinError
                : 'Unknown error';

            const userFriendlyMessage = (() => {
              switch (errorMessage) {
                case 'meeting_not_found':
                  return 'Call not found or has expired.';
                case 'invalid_token':
                  return 'Call authentication failed.';
                case 'unauthorized_access':
                  return 'You are not authorized to join this call.';
                case 'meeting_expired':
                  return 'Call has expired. Start a new call to continue.';
                case 'meeting_ended':
                  return 'Call has already ended.';
                case 'Socket not connected':
                  return 'Connection to server lost. Please retry.';
                case 'Join meeting timeout':
                  return 'Joining the call took too long. Please retry.';
                default:
                  return errorMessage || 'Could not join the call.';
              }
            })();

            console.log('join_error', joinError);

            showModal('Error', userFriendlyMessage, 'alert-circle', [
              { text: 'OK', onPress: () => { closeModal(); joinAttempted.current = false; navigation.goBack(); } }
            ]);
            return;
          }

          if (!joined) {
            showModal('Error', 'Could not join call. Please check the call ID and try again.', 'alert-circle', [
              { text: 'OK', onPress: () => { closeModal(); joinAttempted.current = false; navigation.goBack(); } }
            ]);
            return;
          }

        } else if (route.params?.type === 'instant') {
          setUsername(username);

          const initResult = await initialize(username);
          const socket = initResult.socket || initResult;

          if (!socket || !socket.connected) {
            throw new Error('Socket not connected - cannot create call');
          }

          const newMeetingId = await createMeetingWithSocket(socket);

          if (!newMeetingId) {
            throw new Error('Call creation returned empty call ID');
          }

          setShowShareModal(true);

        } else if (!route.params?.type || route.params?.type === 'create') {
          try {
            let socketToUse = socketConnection;
            if (!socketToUse) {
              const initResult = await initialize(username);
              socketToUse = initResult.socket || initResult;
            }

            if (!socketToUse || !socketToUse.connected) {
              throw new Error('Socket not connected - cannot create call');
            }
            await new Promise(resolve => setTimeout(resolve, 100));

            const meetingId = await createMeeting();

            if (!meetingId) {
              throw new Error('Call creation returned empty call ID');
            }
            setShowShareModal(true);
          } catch (meetingError) {
            showModal(
              'Call Creation Failed',
              `Failed to create call: ${meetingError instanceof Error ? meetingError.message : 'Unknown error'}`,
              'alert-circle',
              [{ text: 'OK', onPress: () => { closeModal(); navigation.goBack(); } }]
            );
            return;
          }
        }

      } catch (error) {
        initializationAttempted.current = false;

        const initializationErrorMessage = error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Unknown error';

        console.log('initialize_call_error', error);

        showModal(
          'Connection Error',
          `Failed to initialize voice call: ${initializationErrorMessage}\n\nPlease check your microphone permissions and try again.`,
          'alert-circle',
          [
            { text: 'Cancel', onPress: () => { closeModal(); navigation.goBack(); } },
            { text: 'Retry', onPress: () => { closeModal(); initializationAttempted.current = false; } }
          ]
        );
      }
    };

    initializeCall();
  }, [route.params?.type, route.params?.joinCode, route.params?.autoJoinHandled, localStream, currentMeetingId, showModal, closeModal, navigation]);

  const totalParticipants = remotePeers.length + 1;
  const remoteParticipant = remotePeers[0];
  const callerName = remoteParticipant?.username || remoteParticipant?.name || route.params?.callerName || 'Unknown';

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const loadingView = (
    <View style={[styles.container, { backgroundColor: '#0a0a0a' }]}>
      <StatusBar backgroundColor="black" style="light" />
      <View style={styles.loadingContent}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Setting up audio...</Text>
      </View>
    </View>
  );

  if (!localStream) {
    return loadingView;
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="black" style="light" />

      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f0f1a']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.topSection}>
          <View style={styles.statusRow}>
            {e2eStatus?.initialized && e2eStatus.activeSessions.length > 0 && (
              <TouchableOpacity
                style={styles.e2eIndicator}
                onPress={toggleSecurityCodeModal}
              >
                {e2eStatus.keyExchangeInProgress ? (
                  <>
                    <ActivityIndicator size="small" color="#fbbf24" />
                    <Text style={styles.e2eText}>Securing...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="lock-closed" size={14} color="#10b981" />
                    <Text style={[styles.e2eText, { color: '#10b981' }]}>End-to-End Encrypted</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <View style={styles.callInfo}>
              <Text style={styles.callInfoText}>
                {isDirectCall ? 'Voice Call' : (currentMeetingId ? `ID: ${currentMeetingId}` : 'Connecting...')}
              </Text>
              <Text style={styles.participantCountText}>
                {totalParticipants} participant{totalParticipants === 1 ? '' : 's'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.centerSection}>
          <View style={styles.avatarContainer}>
            <MotiView
              from={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: isConnected ? 1.15 : 1.05, opacity: isConnected ? 0.3 : 0.5 }}
              transition={{
                type: 'timing',
                duration: isConnected ? 1500 : 2000,
                loop: true,
                repeatReverse: true,
              }}
              style={styles.avatarPulseOuter}
            />
            <MotiView
              from={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: isConnected ? 1.1 : 1.03, opacity: isConnected ? 0.4 : 0.6 }}
              transition={{
                type: 'timing',
                duration: isConnected ? 1200 : 1600,
                loop: true,
                repeatReverse: true,
              }}
              style={styles.avatarPulseInner}
            />
            <View style={styles.avatarInner}>
              <Text style={styles.avatarText}>
                {getInitials(callerName)}
              </Text>
            </View>
            {isMuted && (
              <View style={styles.mutedBadge}>
                <Ionicons name="mic-off" size={16} color="#fff" />
              </View>
            )}
          </View>

          <Text style={styles.callerName}>{callerName}</Text>

          <View style={styles.callStatusContainer}>
            {isConnected ? (
              <View style={styles.connectedStatus}>
                <View style={styles.connectedDot} />
                <Text style={styles.durationText}>{formatDuration(callDuration)}</Text>
              </View>
            ) : (
              <View style={styles.connectingStatus}>
                <ActivityIndicator size="small" color="#8b5cf6" />
                <Text style={styles.connectingText}>Connecting...</Text>
              </View>
            )}
          </View>

          {!isDirectCall && currentMeetingId && !isConnected && (
            <View style={styles.joinCodeContainer}>
              <Text style={styles.joinCodeLabel}>Share this code:</Text>
              <TouchableOpacity style={styles.joinCodeBox} onPress={copyJoinCode}>
                <Text style={styles.joinCodeText}>{currentMeetingId}</Text>
                <Ionicons name="copy-outline" size={18} color="#8b5cf6" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareBtn} onPress={shareJoinCode}>
                <Ionicons name="share-outline" size={18} color="#fff" />
                <Text style={styles.shareBtnText}>Share</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TranscriptionOverlay
          sourceText={palabraTranscript}
          translatedText={palabraTranslation}
          visible={subtitlesEnabled && palabraEnabled && palabraState !== 'idle' && palabraState !== 'error'}
          isConnecting={palabraState === 'connecting'}
        />

        <View style={styles.bottomSection}>
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={[styles.controlBtn, subtitlesEnabled && styles.controlBtnActive]}
              onPress={handleSubtitlesToggle}
            >
              <Ionicons
                name={subtitlesEnabled ? "text" : "text-outline"}
                size={22}
                color="#fff"
              />
              <Text style={styles.controlLabel}>Subtitles</Text>
            </TouchableOpacity>

            <TranslationControls
              state={palabraState}
              enabled={palabraEnabled}
              onToggle={handlePalabraToggle}
              style={styles.controlBtn}
              activeStyle={styles.controlBtnActive}
              labelStyle={styles.controlLabel}
            />

            <TouchableOpacity
              style={[styles.endCallBtn]}
              onPress={handleCloseCall}
            >
              <Ionicons name="call" size={28} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
              onPress={toggleMute}
            >
              <Ionicons
                name={isMuted ? 'mic-off' : 'mic'}
                size={22}
                color="#fff"
              />
              <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlBtn, isSpeakerOn && styles.controlBtnActive]}
              onPress={handleSpeakerToggle}
            >
              <Ionicons
                name={isSpeakerOn ? 'volume-high' : 'volume-medium-outline'}
                size={22}
                color="#fff"
              />
              <Text style={styles.controlLabel}>Speaker</Text>
            </TouchableOpacity>
          </View>
        </View>

        {awaitingHostApproval && (
          <View style={styles.approvalOverlay}>
            <View style={styles.approvalBox}>
              <ActivityIndicator size="small" color="#8b5cf6" />
              <Text style={styles.approvalText}>Waiting for host approval...</Text>
            </View>
          </View>
        )}

        {remotePeers.map(peer => {
          const stream = remoteStreams?.get(peer.peerId);
          if (!stream) return null;
          return (
            <RTCView
              key={`audio-${peer.peerId}`}
              streamURL={stream.toURL()}
              style={styles.hiddenAudio}
            />
          );
        })}
      </LinearGradient>

      <GlassModal
        isVisible={Boolean(isMeetingOwner && pendingJoinRequest)}
        onClose={handleDenyJoinRequest}
        title="Approve Participant"
        icon="person-add"
        height={230}
      >
        {pendingJoinRequest && (
          <View style={styles.approvalModalContent}>
            <Text style={[styles.modalMessage, { color: colors.text }]}>
              {pendingJoinRequest.username} is requesting access.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#dc2626' }]}
                onPress={handleDenyJoinRequest}
              >
                <Text style={styles.modalButtonText}>Deny</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#10b981' }]}
                onPress={handleApproveJoinRequest}
              >
                <Text style={styles.modalButtonText}>Approve</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </GlassModal>

      <GlassModal
        isVisible={modalConfig.visible}
        onClose={closeModal}
        title={modalConfig.title}
        icon={modalConfig.icon}
        height={280}
      >
        <Text style={[styles.modalMessage, { color: colors.text }]}>
          {modalConfig.message}
        </Text>
        <View style={styles.modalButtons}>
          {modalConfig.buttons.map((button, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.modalButton, { backgroundColor: '#8b5cf6' }]}
              onPress={() => {
                closeModal();
                button.onPress?.();
              }}
            >
              <Text style={styles.modalButtonText}>{button.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </GlassModal>

      <GlassModal
        isVisible={Boolean(joinDeniedReason)}
        onClose={handleJoinDeniedClose}
        title="Access Denied"
        icon="shield-outline"
        height={220}
      >
        <Text style={[styles.modalMessage, { color: colors.text }]}>
          {joinDeniedReason}
        </Text>
        <View style={styles.modalButtons}>
          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: '#dc2626' }]}
            onPress={handleJoinDeniedClose}
          >
            <Text style={styles.modalButtonText}>Leave Call</Text>
          </TouchableOpacity>
        </View>
      </GlassModal>

      <GlassModal
        isVisible={showShareModal && !!currentMeetingId && !isDirectCall}
        onClose={() => setShowShareModal(false)}
        title="Share Call"
        subtitle="Invite others to join"
        icon="people"
        height={360}
      >
        <View style={styles.shareModalContent}>
          <Text style={[styles.shareModalLabel, { color: colors.textSecondary }]}>
            Call ID
          </Text>
          <TouchableOpacity
            style={[styles.shareModalCodeBox, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={copyJoinCode}
            activeOpacity={0.7}
          >
            <Text style={[styles.shareModalCode, { color: colors.text }]}>{currentMeetingId}</Text>
            <Ionicons name="copy-outline" size={22} color="#8b5cf6" />
          </TouchableOpacity>
          <Text style={[styles.shareModalHint, { color: colors.textSecondary }]}>
            Share this code with participants to join your call
          </Text>
          <TouchableOpacity
            style={styles.shareModalButton}
            onPress={() => {
              shareJoinCode();
              setShowShareModal(false);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="share-outline" size={20} color="#fff" />
            <Text style={styles.shareModalButtonText}>Share Code</Text>
          </TouchableOpacity>
        </View>
      </GlassModal>

      <GlassModal
        isVisible={showSecurityCodeModal}
        onClose={toggleSecurityCodeModal}
        title="End-to-End Encryption"
        icon="shield-checkmark"
        height={390}
      >
        <View style={styles.securityCodeContent}>
          <View style={styles.securityBadge}>
            <Ionicons name="lock-closed" size={24} color="#10b981" />
            <Text style={[styles.securityBadgeText, { color: colors.text }]}>
              Your call is end-to-end encrypted
            </Text>
          </View>

          <Text style={[styles.securityDescription, { color: colors.textSecondary }]}>
            Your conversation is protected with end-to-end encryption. Only you and the participants can hear the call.
          </Text>

          {e2eStatus && e2eStatus.activeSessions.length > 0 && (
            <View style={styles.securityCodesContainer}>
              <Text style={[styles.securityCodesTitle, { color: colors.text }]}>
                Security Verification Codes
              </Text>
              {e2eStatus.activeSessions.map((sessionPeerId) => {
                const code = getSecurityCode?.(sessionPeerId);
                const participant = participants.find(p => p.peerId === sessionPeerId);

                return (
                  <View key={sessionPeerId} style={styles.securityCodeItem}>
                    <Text style={[styles.participantName, { color: colors.text }]}>
                      {participant?.username || participant?.name || 'Unknown'}
                    </Text>
                    {code ? (
                      <Text style={styles.securityCodeValue}>{code}</Text>
                    ) : (
                      <Text style={[styles.securityCodePending, { color: colors.textSecondary }]}>
                        Establishing secure connection...
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          <Text style={[styles.securityFooter, { color: colors.textSecondary }]}>
            Verify codes with participants to ensure security.
          </Text>
        </View>
      </GlassModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  gradient: {
    flex: 1,
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '600',
    marginTop: 16,
  },
  topSection: {
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  e2eIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  e2eText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  callInfo: {
    alignItems: 'flex-end',
  },
  callInfoText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  participantCountText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 2,
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatarContainer: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarPulseOuter: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#8b5cf6',
  },
  avatarPulseInner: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#8b5cf6',
  },
  avatarInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#6d28d9',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  avatarText: {
    fontSize: 42,
    fontWeight: '700',
    color: '#ffffff',
  },
  mutedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callerName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  callStatusContainer: {
    marginTop: 8,
  },
  connectedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  durationText: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '500',
  },
  connectingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectingText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
  joinCodeContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  joinCodeLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  joinCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  joinCodeText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 2,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  shareBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  bottomSection: {
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderRadius: 24,
  },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtnActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.4)',
  },
  controlLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    position: 'absolute',
    bottom: -18,
    width: 60,
    textAlign: 'center',
  },
  endCallBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  approvalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10,10,10,0.75)',
  },
  approvalBox: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    gap: 12,
  },
  approvalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  approvalModalContent: {
    gap: 16,
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
  shareModalContent: {
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  shareModalLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  shareModalCodeBox: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  shareModalCode: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 4,
  },
  shareModalHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  shareModalButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  shareModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  securityCodeContent: {
    gap: 14,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
  },
  securityBadgeText: {
    fontSize: 15,
    fontWeight: '600',
  },
  securityDescription: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  securityCodesContainer: {
    marginTop: 6,
    gap: 10,
  },
  securityCodesTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  securityCodeItem: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    padding: 10,
    gap: 5,
  },
  participantName: {
    fontSize: 12,
    fontWeight: '600',
  },
  securityCodeValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#8b5cf6',
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
  securityCodePending: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  securityFooter: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
  },
  hiddenAudio: {
    width: 0,
    height: 0,
    position: 'absolute',
  },
});
