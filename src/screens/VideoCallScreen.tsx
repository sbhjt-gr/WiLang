import React, {useContext, useLayoutEffect, useRef, useEffect, useState, useCallback} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  PanResponder,
  StatusBar as RNStatusBar,
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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { User } from '../store/WebRTCTypes';
import ParticipantGrid from '../components/ParticipantGrid';

const {width, height} = Dimensions.get('window');

type VideoCallScreenNavigationProp = StackNavigationProp<RootStackParamList, 'VideoCallScreen'>;
type VideoCallScreenRouteProp = RouteProp<RootStackParamList, 'VideoCallScreen'>;

interface Props {
  navigation: VideoCallScreenNavigationProp;
  route: VideoCallScreenRouteProp;
}

export default function VideoCallScreen({ navigation, route }: Props) {
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
  } = useContext(WebRTCContext);

  const [controlsVisible, setControlsVisible] = useState(true);
  const [isGridMode, setIsGridMode] = useState(false);
  const [isInstantCall, setIsInstantCall] = useState(false);
  const [showJoinCodeUI, setShowJoinCodeUI] = useState(false);
  
  const initializationAttempted = useRef(false);
  const joinAttempted = useRef(false);
  const controlsTimer = useRef<NodeJS.Timeout | null>(null);

  const toggleControls = useCallback(() => {
    if (controlsTimer.current) {
      clearTimeout(controlsTimer.current);
    }

    if (controlsVisible) {
      setControlsVisible(false);
    } else {
      setControlsVisible(true);
      
      controlsTimer.current = setTimeout(() => {
        setControlsVisible(false);
      }, 4000);
    }
  }, [controlsVisible]);

  const toggleViewMode = useCallback(() => {
    setIsGridMode(prev => !prev);
  }, []);

  const shareJoinCode = useCallback(async () => {
    if (!currentMeetingId) {
      Alert.alert('Please wait', 'Meeting code is still being generated.');
      return;
    }
    
    try {
      const message = `Join my WhisperLang video call!\n\nJoin Code: ${currentMeetingId}\n\nDownload WhisperLang and enter this code to join the call with real-time translation.`;
      
      await Share.share({
        message,
        title: 'Join My Video Call',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Unable to share join code: ${message}`);
    }
  }, [currentMeetingId]);

  const copyJoinCode = useCallback(() => {
    if (!currentMeetingId) {
      Alert.alert('Please wait', 'Meeting code is still being generated.');
      return;
    }
    
    Clipboard.setStringAsync(currentMeetingId);
    Alert.alert('Copied!', 'Join code copied to clipboard');
  }, [currentMeetingId]);

  const handleCloseCall = useCallback(() => {
    closeCall();
    navigation.navigate('HomeScreen', {});
  }, [closeCall, navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    controlsTimer.current = setTimeout(() => {
      setControlsVisible(false);
    }, 4000);

    return () => {
      if (controlsTimer.current) {
        clearTimeout(controlsTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (route.params.type === 'join' && route.params.joinCode && !joinAttempted.current) {
      joinAttempted.current = true;
    }
  }, [route.params.type, route.params.joinCode]);

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
        if (!localStream || (route.params.type === 'join' && !currentMeetingId)) {
          const initResult = await initialize(username);
          socketConnection = initResult.socket || initResult;
          if (!localStream && !initResult.localStream) {
            throw new Error('Failed to obtain local media stream after initialization');
          }
        }
        if (route.params.type === 'join') {
          if (joinAttempted.current) {
            if (!currentMeetingId) {
              joinAttempted.current = false;
            } else {
              return;
            }
          }
          
          joinAttempted.current = true;
          
          const meetingId = route.params.joinCode || route.params.id;
          
          if (!meetingId) {
            Alert.alert('Error', 'No meeting ID provided to join.');
            navigation.goBack();
            return;
          }
          
          const joined = await joinMeeting(meetingId, socketConnection);
          
          if (!joined) {
            Alert.alert('Error', 'Could not join meeting. Please check the meeting ID and try again.');
            joinAttempted.current = false;
            navigation.goBack();
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
            throw new Error('Socket not connected - cannot create meeting');
          }
          
          const newMeetingId = await createMeetingWithSocket(socket);
          
          if (!newMeetingId) {
            throw new Error('Meeting creation returned empty meeting ID');
          }
          
        } else if (!route.params.type || route.params.type === 'create') {
          try {
            let socketToUse = socketConnection;
            if (!socketToUse) {
              const initResult = await initialize(username);
              socketToUse = initResult.socket || initResult;
            }
            
            if (!socketToUse || !socketToUse.connected) {
              throw new Error('Socket not connected - cannot create meeting');
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const meetingId = await createMeeting();
            
            if (!meetingId) {
              throw new Error('Meeting creation returned empty meeting ID');
            }
            setShowJoinCodeUI(true);
            
            Alert.alert(
              'Meeting Created',
              `Your meeting ID is: ${meetingId}\n\nShare this ID with participants to join the meeting.`,
              [{ text: 'OK' }]
            );
          } catch (meetingError) {
            Alert.alert(
              'Meeting Creation Failed',
              `Failed to create meeting: ${meetingError instanceof Error ? meetingError.message : 'Unknown error'}`,
              [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
            return;
          }
        }
        
      } catch (error) {
        initializationAttempted.current = false;
        
        Alert.alert(
          'Connection Error', 
          `Failed to initialize video call: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check your camera and microphone permissions and try again.`,
          [
            { text: 'Cancel', onPress: () => navigation.goBack() },
            { text: 'Retry', onPress: () => {
              initializationAttempted.current = false;
            }}
          ]
        );
      }
    };

    initializeCall();
  }, [route.params.type, route.params.joinCode, localStream, currentMeetingId]);

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
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.2)', 'rgba(236, 72, 153, 0.2)']}
              style={styles.waitingGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.waitingContent}>
                <ActivityIndicator size="large" color="#8b5cf6" />
                <Text style={styles.waitingText}>
                  {currentMeetingId ? `Meeting: ${currentMeetingId}` : 'Setting up meeting...'}
                </Text>
                <Text style={styles.waitingSubtext}>
                  {remoteParticipants?.length > 0 
                    ? `${remoteParticipants.length} participant${remoteParticipants.length === 1 ? '' : 's'} connected`
                    : 'Waiting for participants to join...'
                  }
                </Text>
                
                {/* Join Code UI for instant calls and meeting creation */}
                {showJoinCodeUI && currentMeetingId && (
                  <View style={styles.joinCodeContainer}>
                    <Text style={styles.joinCodeLabel}>Share this code to invite others:</Text>
                    <TouchableOpacity style={styles.joinCodeBox} onPress={copyJoinCode}>
                      <Text style={styles.joinCodeText}>{currentMeetingId}</Text>
                      <Ionicons name="copy-outline" size={20} color="#8b5cf6" />
                    </TouchableOpacity>
                    <View style={styles.shareButtons}>
                      <TouchableOpacity style={styles.shareButton} onPress={shareJoinCode}>
                        <LinearGradient
                          colors={['#667eea', '#764ba2']}
                          style={styles.shareButtonGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <Ionicons name="share-outline" size={20} color="#ffffff" />
                          <Text style={styles.shareButtonText}>Share Code</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </LinearGradient>
          </View>
        )}
        
        {/* Always show local video floating box in featured view when local stream is available */}
        {localStream && (
          <View
            key={`featured-local-stream`}
            style={styles.localVideoContainer}
          >
            <LinearGradient
              colors={['#8b5cf6', '#ec4899']}
              style={styles.localVideoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <RTCView
                style={styles.localVideo}
                streamURL={localStream.toURL()}
                objectFit="cover"
                mirror={true}
                zOrder={1}
              />
            </LinearGradient>
          </View>
        )}
      </View>
    );
  };

  if (!localStream) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar backgroundColor="black" style="light" />
        <LinearGradient
          colors={['#0f0f23', '#1a1a2e']}
          style={styles.loadingGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#8b5cf6" />
            <Text style={styles.loadingText}>Setting up camera...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const remoteParticipants = participants.filter(p => !p.isLocal && p.peerId !== peerId);
  const totalParticipants = remoteParticipants.length + 1;
  const shouldUseFeaturedViewForCall = totalParticipants <= 2 && !isGridMode;

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={1}
      onPress={toggleControls}
    >
      <StatusBar backgroundColor="black" style="light" />
      <RNStatusBar hidden />
      
      {shouldUseFeaturedViewForCall ? renderFeaturedView() : renderGridView()}
      
      {controlsVisible && (
        <View
          style={styles.topControls}
          pointerEvents={controlsVisible ? 'auto' : 'none'}
        >
        {totalParticipants >= 2 && (
          <TouchableOpacity style={styles.topControlButton} onPress={toggleViewMode}>
            <LinearGradient
              colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.6)']}
              style={styles.topControlGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons 
                name={shouldUseFeaturedViewForCall ? "grid" : "person"} 
                size={20} 
                color="#ffffff" 
              />
              <Text style={styles.topControlText}>
                {shouldUseFeaturedViewForCall ? "Grid" : "Focus"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
        
        <View style={styles.meetingInfo}>
          <LinearGradient
            colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.6)']}
            style={styles.meetingInfoGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.meetingIdText}>
              {currentMeetingId ? `ID: ${currentMeetingId}` : 'Connecting...'}
            </Text>
            <Text style={styles.participantCountText}>
              {totalParticipants} participant{totalParticipants === 1 ? '' : 's'}
            </Text>
          </LinearGradient>
        </View>
      </View>
      )}
      
      {controlsVisible && (
        <View
          style={styles.bottomControls}
          pointerEvents={controlsVisible ? 'auto' : 'none'}
        >
        <LinearGradient
          colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.1)']}
          style={styles.controlsBackground}
          start={{ x: 0, y: 1 }}
          end={{ x: 0, y: 0 }}
        >
          <View style={styles.controlButtonsRow}>
            <TouchableOpacity
              style={[styles.controlButton, styles.secondaryButton]}
              onPress={switchCamera}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
                style={styles.controlButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="camera-reverse" size={24} color="#8b5cf6" />
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.controlButton, isMuted ? styles.mutedButton : styles.secondaryButton]}
              onPress={toggleMute}
            >
              <LinearGradient
                colors={isMuted ? ['#ff6b6b', '#ee5a52'] : ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
                style={styles.controlButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons
                  name={isMuted ? 'mic-off' : 'mic'}
                  size={24}
                  color={isMuted ? '#ffffff' : '#8b5cf6'}
                />
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.controlButton, styles.endCallButton]}
              onPress={handleCloseCall}
            >
              <LinearGradient
                colors={['#ff6b6b', '#ee5a52']}
                style={styles.controlButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="call" size={28} color="#ffffff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
  },
  loadingGradient: {
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
  },
  waitingGradient: {
    width: '100%',
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
    color: '#667eea',
    letterSpacing: 2,
    marginRight: 12,
  },
  shareButtons: {
    alignItems: 'center',
  },
  shareButton: {
    borderRadius: 12,
    overflow: 'hidden',
    minWidth: 140,
  },
  shareButtonGradient: {
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
    width: 120,
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
  },
  localVideoGradient: {
    flex: 1,
    padding: 3,
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
  topControlButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  topControlGradient: {
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
  meetingInfo: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  meetingInfoGradient: {
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
  controlsBackground: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 20,
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
    overflow: 'hidden',
  },
  controlButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButton: {},
  mutedButton: {},
  endCallButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
});
