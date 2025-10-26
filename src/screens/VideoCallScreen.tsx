import React, {useContext, useLayoutEffect, useRef, useEffect, useState, useCallback, useMemo} from 'react';
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
import {RTCView} from 'react-native-webrtc';
import { StatusBar } from 'expo-status-bar';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { auth } from "../config/firebase";
import { RootStackParamList } from '../types/navigation';
import {WebRTCContext} from '../store/WebRTCContext';
import { Ionicons } from '@expo/vector-icons';
import { User } from '../store/WebRTCTypes';
import ParticipantGrid from '../components/ParticipantGrid';
import GlassModal from '../components/GlassModal';
import SubtitleOverlay from '../components/SubtitleOverlay';
import useWhisperSTT from '../hooks/useWhisperSTT';
import { useTheme } from '../theme';
import { whisperModelDownloader } from '../services/whisper/WhisperModelDownloader';

const {width, height} = Dimensions.get('window');

type VideoCallScreenNavigationProp = StackNavigationProp<RootStackParamList, 'VideoCallScreen'>;
type VideoCallScreenRouteProp = RouteProp<RootStackParamList, 'VideoCallScreen'>;

interface Props {
  navigation: VideoCallScreenNavigationProp;
  route: VideoCallScreenRouteProp;
}

export default function VideoCallScreen({ navigation, route }: Props) {
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
    switchCamera,
    initialize,
    createMeeting,
    joinMeeting,
    currentMeetingId,
    refreshParticipantVideo,
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
  } = useContext(WebRTCContext);

  const [isGridMode, setIsGridMode] = useState(true);
  const [isInstantCall, setIsInstantCall] = useState(false);
  const [showJoinCodeUI, setShowJoinCodeUI] = useState(false);
  const [isDirectCall, setIsDirectCall] = useState(false);
  const [showSecurityCodeModal, setShowSecurityCodeModal] = useState(false);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [modelsDownloaded, setModelsDownloaded] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    icon: string;
    buttons: Array<{text: string; onPress?: () => void}>;
  }>({
    visible: false,
    title: '',
    message: '',
    icon: 'information-circle',
    buttons: [],
  });

  const sttEnabled = Boolean(localStream) && subtitlesEnabled;
  const {
    subtitle: subtitleState,
    detectedLanguage: sttLanguage,
    confidence: sttConfidence,
    isActive: sttActive,
    isInitializing: sttInitializing,
    isDownloading: sttDownloading,
    downloadProgress: sttProgress,
    error: sttError,
    reset: resetStt,
  } = useWhisperSTT({
    enabled: sttEnabled,
    modelVariant: 'small',
    vadPreset: 'meeting',
    language: 'auto',
    allowedLanguages: ['en', 'es', 'fr', 'hi', 'de', 'pt', 'bn', 'sv', 'ja', 'ko'],
  });

  const initializationAttempted = useRef(false);
  const joinAttempted = useRef(false);
  const subtitleErrorRef = useRef<string | null>(null);

  const showModal = useCallback((title: string, message: string, icon: string = 'information-circle', buttons: Array<{text: string; onPress?: () => void}> = [{text: 'OK'}]) => {
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

  const toggleViewMode = useCallback(() => {
    setIsGridMode(prev => !prev);
  }, []);

  const checkModelsDownloaded = useCallback(async () => {
    const smallExists = await whisperModelDownloader.checkModelExists('small');
    const vadExists = await whisperModelDownloader.checkModelExists('vad');
    const downloaded = smallExists && vadExists;
    setModelsDownloaded(downloaded);
    return downloaded;
  }, []);

  const toggleSubtitles = useCallback(async () => {
    if (!subtitlesEnabled) {
      const downloaded = await checkModelsDownloaded();
      if (!downloaded) {
        showModal(
          'Download Required',
          'Subtitle models need to be downloaded before you can enable real-time transcription.',
          'download-outline',
          [
            { text: 'Cancel', onPress: closeModal },
            {
              text: 'Download Models',
              onPress: () => {
                closeModal();
                navigation.navigate('ModelsDownloadScreen');
              }
            }
          ]
        );
        return;
      }
    }
    setSubtitlesEnabled(prev => !prev);
  }, [subtitlesEnabled, checkModelsDownloaded, showModal, closeModal, navigation]);

  const shareJoinCode = useCallback(async () => {
    if (!currentMeetingId) {
      showModal('Please wait', 'Call code is still being generated.', 'time');
      return;
    }
    
    try {
      const message = `Join my WiLang video call!\n\nJoin Code: ${currentMeetingId}\n\nDownload WiLang and enter this code to join the call with real-time translation.`;
      
      await Share.share({
        message,
        title: 'Join My Video Call',
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

  const handleCloseCall = useCallback(() => {
    closeCall();
    navigation.navigate('HomeScreen', {});
  }, [closeCall, navigation]);

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

  const handleJoinDeniedClose = useCallback(() => {
    acknowledgeJoinDenied?.();
    closeCall();
    navigation.goBack();
  }, [acknowledgeJoinDenied, closeCall, navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    checkModelsDownloaded();
  }, [checkModelsDownloaded]);

  useEffect(() => {
    if (route.params.type === 'join' && route.params.joinCode && !joinAttempted.current) {
      joinAttempted.current = true;
    }
  }, [route.params.type, route.params.joinCode, route.params.autoJoinHandled]);

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
        if (!localStream || (route.params.type === 'join' && !currentMeetingId) || route.params.type === 'incoming' || route.params.type === 'outgoing') {
          const initResult = await initialize(username);
          socketConnection = initResult.socket || initResult;
          if (!localStream && !initResult.localStream) {
            throw new Error('Failed to obtain local media stream after initialization');
          }
        }
        if (route.params.type === 'join' || route.params.type === 'incoming' || route.params.type === 'outgoing') {
          if (joinAttempted.current) {
            if (!currentMeetingId) {
              joinAttempted.current = false;
            } else {
              return;
            }
          }
          
          // Mark as direct call for incoming/outgoing (hide meeting ID)
          if (route.params.type === 'incoming' || route.params.type === 'outgoing') {
            setIsDirectCall(true);
          }
          
          joinAttempted.current = true;
          
          const meetingId = route.params.joinCode || route.params.id;
          const meetingToken = route.params.meetingToken;

          if (route.params.autoJoinHandled && currentMeetingId === meetingId) {
            console.log('join_skipped_auto', { meetingId });
            return;
          }

          if (!meetingId) {
            showModal('Error', 'No call ID provided to join.', 'alert-circle', [
              { text: 'OK', onPress: () => { closeModal(); navigation.goBack(); } }
            ]);
            return;
          }

          const currentUser = auth.currentUser;
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
          
        } else if (route.params.type === 'instant') {
          setIsInstantCall(true);
          setShowJoinCodeUI(true);
          
          const currentUser = auth.currentUser;
          const username = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';
          
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
          
        } else if (!route.params.type || route.params.type === 'create') {
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
            setShowJoinCodeUI(true);

            showModal(
              'Call Created',
              `Your call ID is: ${meetingId}\n\nShare this ID with participants to join the call.`,
              'checkmark-circle'
            );
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
          `Failed to initialize video call: ${initializationErrorMessage}\n\nPlease check your camera and microphone permissions and try again.`,
          'alert-circle',
          [
            { text: 'Cancel', onPress: () => { closeModal(); navigation.goBack(); } },
            { text: 'Retry', onPress: () => { closeModal(); initializationAttempted.current = false; } }
          ]
        );
      }
    };

    initializeCall();
  }, [route.params.type, route.params.joinCode, route.params.autoJoinHandled, localStream, currentMeetingId, showModal, closeModal, navigation]);

  useEffect(() => {
    if (!subtitlesEnabled) {
      setSubtitleVisible(false);
    }
  }, [subtitlesEnabled]);

  useEffect(() => {
    if (!subtitleState) {
      setSubtitleVisible(false);
      return;
    }
    setSubtitleVisible(true);
    const timeout = setTimeout(() => setSubtitleVisible(false), 2600);
    return () => clearTimeout(timeout);
  }, [subtitleState]);

  useEffect(() => {
    if (!subtitlesEnabled || !sttEnabled) {
      resetStt().catch(() => {});
    }
  }, [resetStt, sttEnabled, subtitlesEnabled]);

  useEffect(() => {
    if (!sttError) {
      subtitleErrorRef.current = null;
      return;
    }
    if (subtitleErrorRef.current === sttError) {
      return;
    }
    subtitleErrorRef.current = sttError;
    showModal('Transcription Error', sttError, 'alert-circle');
  }, [sttError, showModal]);

  useEffect(() => {
    const remoteParticipants = participants.filter(p => !p.isLocal && p.peerId !== peerId);
    if (remoteParticipants.length > 0) {
      setShowJoinCodeUI(false);
    }
  }, [participants, peerId]);

  const renderGridView = () => {
    const remoteParticipants = participants.filter(p => !p.isLocal && p.peerId !== peerId);
    
    return (
      <ParticipantGrid
        participants={remoteParticipants}
        localStream={localStream}
        remoteStreams={remoteStreams}
        currentUser={peerId || 'anonymous'}
        onRefreshParticipant={refreshParticipantVideo}
      />
    );
  };

  const renderFeaturedView = () => {
    const remoteParticipants = participants.filter(p => !p.isLocal && p.peerId !== peerId);
    const remoteParticipant = remoteParticipants.find(p => !p.isLocal);
    const remoteStream = remoteParticipant ? remoteStreams?.get(remoteParticipant.peerId) : null;
    
    return (
      <View style={styles.featuredContainer}>
        {remoteStream && remoteParticipant ? (
          <View
            key={`featured-remote-${remoteParticipant.peerId}`}
            style={styles.remoteVideoContainer}
          >
            <RTCView
              style={styles.remoteVideo}
              streamURL={remoteStream.toURL()}
              objectFit="cover"
            />
          </View>
        ) : (
          <View
            key="featured-waiting-view"
            style={styles.waitingContainer}
          >
            <View style={styles.waitingContent}>
              <ActivityIndicator size="large" color="#8b5cf6" />
              <Text style={styles.waitingText}>
                {isDirectCall ? 'Connecting call...' : (currentMeetingId ? `Call: ${currentMeetingId}` : 'Setting up call...')}
              </Text>
              <Text style={styles.waitingSubtext}>
                {remoteParticipants?.length > 0
                  ? `${remoteParticipants.length} participant${remoteParticipants.length === 1 ? '' : 's'} connected`
                  : 'Waiting for participants to join...'
                }
              </Text>

              {/* Join Code UI for instant calls and meeting creation */}
              {showJoinCodeUI && currentMeetingId && !isDirectCall && (
                <View style={styles.joinCodeContainer}>
                  <Text style={styles.joinCodeLabel}>Share this code to invite others:</Text>
                  <TouchableOpacity style={styles.joinCodeBox} onPress={copyJoinCode}>
                    <Text style={styles.joinCodeText}>{currentMeetingId}</Text>
                    <Ionicons name="copy-outline" size={20} color="#8b5cf6" />
                  </TouchableOpacity>
                  <View style={styles.shareButtons}>
                    <TouchableOpacity style={[styles.shareButton, { backgroundColor: '#8b5cf6' }]} onPress={shareJoinCode}>
                      <Ionicons name="share-outline" size={20} color="#ffffff" />
                      <Text style={styles.shareButtonText}>Share Code</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}
        
        {/* Always show local video floating box in featured view when local stream is available */}
        {localStream && (
          <View
            key={`featured-local-stream`}
            style={[styles.localVideoContainer, { backgroundColor: '#1f2937', borderWidth: 2, borderColor: '#8b5cf6' }]}
          >
            <RTCView
              style={styles.localVideo}
              streamURL={localStream.toURL()}
              objectFit="cover"
              mirror={true}
              zOrder={1}
            />
          </View>
        )}
      </View>
    );
  };

  const overlayLanguage = subtitleState?.language ?? sttLanguage;
  const overlayConfidence = subtitleState?.confidence ?? sttConfidence;
  const overlayText = subtitleVisible && subtitleState ? subtitleState.text : '';
  const subtitleStatus = useMemo(() => {
    if (!subtitlesEnabled) {
      return null;
    }
    if (sttDownloading) {
      const percent = Math.max(0, Math.min(100, Math.round(sttProgress * 100)));
      return `Downloading ${percent}%`;
    }
    if (sttInitializing) {
      return 'Starting';
    }
    if (sttEnabled && !sttActive) {
      return 'Standby';
    }
    if (sttActive && !subtitleVisible) {
      return 'Listening';
    }
    return null;
  }, [sttActive, sttDownloading, sttEnabled, sttInitializing, sttProgress, subtitleVisible, subtitlesEnabled]);

  const subtitleButtonColor = sttError ? '#dc2626' : sttDownloading ? '#fbbf24' : sttInitializing ? '#f59e0b' : subtitlesEnabled ? '#8b5cf6' : '#9ca3af';
  const subtitleButtonBackground = subtitlesEnabled ? 'rgba(255,255,255,0.15)' : 'rgba(31,41,55,0.7)';

  const remoteParticipants = participants.filter(p => !p.isLocal && p.peerId !== peerId);
  const totalParticipants = remoteParticipants.length + 1;
  const shouldUseFeaturedViewForCall = !isGridMode;

  if (!localStream) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: '#0a0a0a' }]}>
        <StatusBar backgroundColor="black" style="light" />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Setting up camera...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="black" style="light" />

      {shouldUseFeaturedViewForCall ? renderFeaturedView() : renderGridView()}

      <View style={styles.topControls}>
        <TouchableOpacity style={[styles.topControlButton, { backgroundColor: 'rgba(0,0,0,0.7)' }]} onPress={toggleViewMode}>
          <Ionicons
            name={isGridMode ? "person" : "grid"}
            size={20}
            color="#ffffff"
          />
          <Text style={styles.topControlText}>
            {isGridMode ? "Focus" : "Grid"}
          </Text>
        </TouchableOpacity>

        <View style={styles.topRightControls}>
          {e2eStatus?.initialized && (
            <TouchableOpacity 
              style={[styles.e2eIndicator, { backgroundColor: 'rgba(0,0,0,0.7)' }]}
              onPress={e2eStatus.activeSessions.length > 0 ? toggleSecurityCodeModal : undefined}
              disabled={e2eStatus.activeSessions.length === 0}
            >
              {e2eStatus.keyExchangeInProgress ? (
                <>
                  <ActivityIndicator size="small" color="#fbbf24" />
                  <Text style={styles.e2eText}>Securing...</Text>
                </>
              ) : e2eStatus.activeSessions.length > 0 ? (
                <>
                  <Ionicons name="lock-closed" size={16} color="#10b981" />
                  <Text style={[styles.e2eText, { color: '#10b981' }]}>End-to-End Encrypted</Text>
                </>
              ) : (
                <>
                  <Ionicons name="lock-open" size={16} color="#6b7280" />
                  <Text style={[styles.e2eText, { color: '#9ca3af' }]}>Not Encrypted</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <View style={[styles.meetingInfo, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
            <Text style={styles.meetingIdText}>
              {isDirectCall ? 'Video Call' : (currentMeetingId ? `ID: ${currentMeetingId}` : 'Connecting...')}
            </Text>
            <Text style={styles.participantCountText}>
              {totalParticipants} participant{totalParticipants === 1 ? '' : 's'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.subtitleWrapper} pointerEvents="none">
        <SubtitleOverlay
          text={overlayText}
          language={overlayLanguage}
          confidence={overlayConfidence ?? null}
          visible={subtitleVisible || Boolean(subtitleStatus)}
          status={subtitleStatus}
        />
      </View>

      <View style={styles.bottomControls}>
        <View style={styles.controlsBackground}>
          <View style={styles.controlButtonsRow}>
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: subtitleButtonBackground }]}
              onPress={toggleSubtitles}
            >
              <Ionicons name="chatbubble-ellipses" size={24} color={subtitleButtonColor} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
              onPress={switchCamera}
            >
              <Ionicons name="camera-reverse" size={24} color="#8b5cf6" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: isMuted ? '#dc2626' : 'rgba(255,255,255,0.15)' }]}
              onPress={toggleMute}
            >
              <Ionicons
                name={isMuted ? 'mic-off' : 'mic'}
                size={24}
                color={isMuted ? '#ffffff' : '#8b5cf6'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, styles.endCallButton, { backgroundColor: '#dc2626' }]}
              onPress={handleCloseCall}
            >
              <Ionicons name="call" size={28} color="#ffffff" />
            </TouchableOpacity>
          </View>
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

      <GlassModal
        isVisible={Boolean(isMeetingOwner && pendingJoinRequest)}
        onClose={handleDenyJoinRequest}
        title="Approve Participant"
        icon="person-add"
        height={280}
      >
        {pendingJoinRequest && (
          <View style={styles.approvalModalContent}>
            <Text style={[styles.modalMessage, { color: colors.text }]}
            >
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
        height={300}
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
        height={260}
      >
        <Text style={[styles.modalMessage, { color: colors.text }]}
        >
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
        isVisible={showSecurityCodeModal}
        onClose={toggleSecurityCodeModal}
        title="End-to-End Encryption"
        icon="shield-checkmark"
        height={480}
      >
        <View style={styles.securityCodeContent}>
          <View style={styles.securityBadge}>
            <Ionicons name="lock-closed" size={24} color="#10b981" />
            <Text style={[styles.securityBadgeText, { color: colors.text }]}>
              Your call is end-to-end encrypted
            </Text>
          </View>

          <Text style={[styles.securityDescription, { color: colors.textSecondary }]}>
            Your conversation is protected with end-to-end encryption. Only you and the participants can see and hear the call.
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '600',
    marginTop: 16,
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#8b5cf6',
  },
  featuredContainer: {
    flex: 1,
  },
  remoteVideoContainer: {
    width: '100%',
    height: '100%',
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  waitingContent: {
    alignItems: 'center',
  },
  waitingText: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  waitingSubtext: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    textAlign: 'center',
  },
  joinCodeContainer: {
    marginTop: 30,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 20,
    minWidth: 280,
  },
  joinCodeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  joinCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  joinCodeText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#8b5cf6',
    letterSpacing: 2,
    marginRight: 12,
  },
  shareButtons: {
    alignItems: 'center',
  },
  shareButton: {
    borderRadius: 12,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  localVideoContainer: {
    position: 'absolute',
    bottom: 120,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
  },
  localVideo: {
    flex: 1,
    borderRadius: 13,
  },
  topControls: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 10,
  },
  topRightControls: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 8,
  },
  topControlButton: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topControlText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  e2eIndicator: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  e2eText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  meetingInfo: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  meetingIdText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  participantCountText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  subtitleWrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 230,
    alignItems: 'center',
    zIndex: 20,
  },
  controlsBackground: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  controlButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endCallButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
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
  approvalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10,10,10,0.75)',
    zIndex: 30,
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
  approvalDetails: {
    fontSize: 14,
  },
});
