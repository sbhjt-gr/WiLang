import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import { mediaDevices, MediaStream, MediaStreamTrack } from '@livekit/react-native-webrtc';
import { setAudioModeAsync } from 'expo-audio';
import * as Notifications from 'expo-notifications';
import InCallManager from 'react-native-incall-manager';
import { doc, getDoc } from 'firebase/firestore';
import { WebRTCContext } from './WebRTCContext';
import { User, WebRTCContextType, E2EStatus, JoinRequest, DirectCallConfig } from './WebRTCTypes';
import { WebRTCSocketManager } from './WebRTCSocketManager';
import { WebRTCPeerManager } from './WebRTCPeerManager';
import { WebRTCMeetingManager } from './WebRTCMeetingManager';
import { keyManager, sessionManager } from '../crypto';
import { callHistoryService } from '../services/CallHistoryService';
import { pushService } from '../services/push-service';
import { callKeepService } from '../services/callkeep-service';
import { navigationRef, navigate, goBack } from '../utils/navigationRef';
import { getCurrentUser } from '../services/FirebaseService';
import { firestore, auth } from '../config/firebase';
import { VideoCallService } from '../services/VideoCallService';

const videoCallService = VideoCallService.getInstance();

interface Props {
  children: React.ReactNode;
}

const WebRTCProvider: React.FC<Props> = ({ children }) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [socket, setSocket] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');
  const [peerId, setPeerId] = useState<string>('');
  const [activeCall, setActiveCall] = useState<string | null>(null);
  const [remoteUser, setRemoteUser] = useState<User | null>(null);
  const [participants, setParticipants] = useState<User[]>([]);
  const participantsRef = useRef<User[]>([]);
  const [currentMeetingId, setCurrentMeetingId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [e2eStatus, setE2EStatus] = useState<E2EStatus>({
    initialized: false,
    keyExchangeInProgress: false,
    activeSessions: [],
    securityCodes: new Map(),
  });
  const [pendingJoinRequests, setPendingJoinRequests] = useState<JoinRequest[]>([]);
  const [awaitingHostApproval, setAwaitingHostApproval] = useState(false);
  const [joinDeniedReason, setJoinDeniedReason] = useState<string | null>(null);
  const [isMeetingOwner, setIsMeetingOwner] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<any>(null);
  const peerIdRef = useRef<string>('');
  const currentMeetingIdRef = useRef<string | null>(null);
  const isMeetingOwnerRef = useRef(false);
  const callStartTimeRef = useRef<number | null>(null);
  const callTypeRef = useRef<'outgoing' | 'incoming' | null>(null);
  const callContactPhoneRef = useRef<string | null>(null);
  const callHistoryLoggedRef = useRef(false);
  const facingModeRef = useRef<'user' | 'environment'>('user');
  const [isDirectCallActive, setIsDirectCallActive] = useState(false);
  type DirectCallState = {
    active: boolean;
    role: 'caller' | 'recipient' | null;
    remoteUser: User | null;
    peerConnectionCreated: boolean;
  };
  const directCallStateRef = useRef<DirectCallState>({
    active: false,
    role: null,
    remoteUser: null,
    peerConnectionCreated: false,
  });

  const socketManager = useRef<WebRTCSocketManager | null>(null);
  const peerManager = useRef<WebRTCPeerManager | null>(null);
  const meetingManager = useRef<WebRTCMeetingManager | null>(null);
  const callerJoinInProgressRef = useRef(false);
  const keyExchangeCounterRef = useRef(0);

  const normalizePhoneNumber = useCallback((phone: string | undefined | null): string | null => {
    if (!phone) return null;

    if (phone.startsWith('+')) {
      return phone;
    }

    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    }
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return `+${cleaned}`;
    }
    if (cleaned.length === 13 && cleaned.startsWith('091')) {
      return `+${cleaned.substring(1)}`;
    }
    return phone.startsWith('+') ? phone : `+${cleaned}`;
  }, []);

  const startKeyExchange = useCallback(() => {
    keyExchangeCounterRef.current += 1;
    setE2EStatus(prev => ({ ...prev, keyExchangeInProgress: true }));
  }, []);

  const finishKeyExchange = useCallback(() => {
    keyExchangeCounterRef.current = Math.max(0, keyExchangeCounterRef.current - 1);
    if (keyExchangeCounterRef.current === 0) {
      setE2EStatus(prev => ({ ...prev, keyExchangeInProgress: false }));
    }
  }, []);

  const ensureDirectCallState = useCallback((options?: { createPeerConnection?: boolean }) => {
    const directState = directCallStateRef.current;
    if (!directState.active) {
      return;
    }

    const remoteFromRoster = directState.remoteUser
      ? participantsRef.current.find(p => p.peerId === directState.remoteUser?.peerId)
      : null;
    const remoteParticipant = remoteFromRoster || directState.remoteUser;

    if (!remoteParticipant) {
      return;
    }

    if (remoteFromRoster && remoteFromRoster !== directState.remoteUser) {
      directCallStateRef.current = {
        ...directState,
        remoteUser: remoteFromRoster,
      };
    }

    const exists = participantsRef.current.some(p => p.peerId === remoteParticipant.peerId);
    if (!exists) {
      const next = [...participantsRef.current.filter(p => p.peerId !== remoteParticipant.peerId), remoteParticipant];
      participantsRef.current = next;
      setParticipants(next);
    }

    setRemoteUser(remoteParticipant);

    if (!callContactPhoneRef.current && remoteParticipant.phoneNumbers?.[0]?.number) {
      callContactPhoneRef.current = normalizePhoneNumber(remoteParticipant.phoneNumbers[0]?.number);
    }

    if (options?.createPeerConnection && peerManager.current && !directState.peerConnectionCreated) {
      const shouldInitiate = directState.role === 'caller';
      const shouldTrack = !!remoteParticipant.userId;
      if (shouldTrack) {
        startKeyExchange();
      }
      directCallStateRef.current = {
        ...directCallStateRef.current,
        peerConnectionCreated: true,
      };
      const connectionPromise = peerManager.current.createPeerConnection(remoteParticipant, shouldInitiate);
      if (connectionPromise && typeof connectionPromise.finally === 'function') {
        connectionPromise
          .catch((error: Error) => {
            console.log('direct_call_peer_connection_failed', { peerId: remoteParticipant.peerId, error: error.message });
            if (error.message === 'encryption_required_but_failed' || error.message === 'encryption_required_but_no_userid') {
              Alert.alert(
                'Encryption Error',
                `Unable to establish a secure connection with ${remoteParticipant.username}.`,
                [{ text: 'OK' }]
              );
            }
          })
          .finally(() => {
            if (shouldTrack) {
              finishKeyExchange();
            }
          });
      } else if (shouldTrack) {
        finishKeyExchange();
      }
    }
  }, [setParticipants, normalizePhoneNumber, startKeyExchange, finishKeyExchange]);

  const prepareDirectCall = useCallback((config: DirectCallConfig) => {
    const remoteUserData: User = {
      id: config.userId || config.peerId,
      userId: config.userId,
      peerId: config.peerId,
      username: config.username,
      name: config.username,
      isLocal: false,
      phoneNumbers: config.phoneNumber ? [{ number: config.phoneNumber }] : undefined,
    };

    directCallStateRef.current = {
      active: true,
      role: config.role,
      remoteUser: remoteUserData,
      peerConnectionCreated: false,
    };

    setIsDirectCallActive(true);
    setRemoteUser(remoteUserData);
    callContactPhoneRef.current = normalizePhoneNumber(config.phoneNumber);
    ensureDirectCallState();
  }, [ensureDirectCallState, normalizePhoneNumber]);

  const endDirectCall = useCallback(() => {
    directCallStateRef.current = {
      active: false,
      role: null,
      remoteUser: null,
      peerConnectionCreated: false,
    };
    setIsDirectCallActive(false);
  }, []);

  const autoJoinCallerMeeting = async (meetingId: string, meetingToken?: string) => {
    if (!meetingId || !meetingToken) {
      return;
    }
    if (!meetingManager.current) {
      return;
    }
    if (callerJoinInProgressRef.current) {
      return;
    }

    callerJoinInProgressRef.current = true;

    try {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        return;
      }

      const userId = currentUser.uid;
      const displayName = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';

      let socketToUse = socketRef.current;

      if (!localStreamRef.current || !socketToUse?.connected) {
        const initResult = await initialize(displayName);
        socketToUse = initResult.socket || socketRef.current;
      }

      if (!socketToUse?.connected) {
        console.log('caller_auto_join_socket_not_ready');
        return;
      }

      await meetingManager.current.joinMeeting(meetingId, socketToUse, meetingToken, userId);
      const pending = meetingManager.current?.isAwaitingApproval() || false;
      setAwaitingHostApproval(pending);
      if (pending) {
        setJoinDeniedReason(null);
        setCurrentMeetingId(meetingId);
        currentMeetingIdRef.current = meetingId;
      }
      setIsMeetingOwner(false);
      isMeetingOwnerRef.current = false;
      console.log('caller_auto_join_success', { meetingId });
    } catch (error) {
      console.log('caller_auto_join_error', error);
    } finally {
      callerJoinInProgressRef.current = false;
    }
  };

  useEffect(() => {
    const initCrypto = async () => {
      try {
        await keyManager.initialize();
        console.log('crypto_initialized');
        setE2EStatus(prev => ({ ...prev, initialized: true }));
      } catch (error) {
        console.log('crypto_init_failed', error);
        setE2EStatus(prev => ({ ...prev, initialized: false }));
      }
    };

    initCrypto();

    if (!socketManager.current) {
      socketManager.current = new WebRTCSocketManager();
      peerManager.current = new WebRTCPeerManager(socketManager.current);
      meetingManager.current = new WebRTCMeetingManager();
      socketManager.current.setCallbacks({
        onUserJoined: (user: User) => {
          console.log('socket_user_joined', {
            peerId: user.peerId,
            username: user.username,
            userId: user.userId
          });
          meetingManager.current?.handleUserJoined(user);
        },
        onUserLeft: (user: User) => {
          console.log('user_left_meeting', user);

          if (user.peerId !== peerIdRef.current) {
            logCallHistory('completed', user);
          }

          meetingManager.current?.handleUserLeft(user);
          peerManager.current?.closePeerConnection(user.peerId);
          setRemoteStreams(prev => {
            const newMap = new Map(prev);
            newMap.delete(user.peerId);
            return newMap;
          });

          if (user.id === remoteUser?.id) {
            setRemoteUser(null);
            setRemoteStream(null);
            setActiveCall(null);
            endDirectCall();
          }
        },
        onOfferReceived: (data: any) => {
          peerManager.current?.handleOffer(data);
        },
        onAnswerReceived: (data: any) => {
          peerManager.current?.handleAnswer(data);
        },
        onIceCandidateReceived: (data: any) => {
          peerManager.current?.handleIceCandidate(data);
        },
        onMeetingEnded: () => {
          const contact = remoteUser || participants.find(p => !p.isLocal);
          endDirectCall();
          leaveMeeting(false, contact);
        },
        onUsersChange: (users: User[]) => {
          setUsers(users);
        },
        onIncomingCall: (callData: any) => {
          console.log('incoming_call_received', callData);
          endDirectCall();

          if (!callStartTimeRef.current) {
            callStartTimeRef.current = Date.now();
            callTypeRef.current = 'incoming';
            callHistoryLoggedRef.current = false;
          }
          callContactPhoneRef.current = normalizePhoneNumber(callData.callerPhone);

          const isVoiceOnly = callData.callType === 'voice';

          Notifications.scheduleNotificationAsync({
            content: {
              title: isVoiceOnly ? 'Incoming Voice Call' : 'Incoming Call',
              body: `${callData.callerName || 'Someone'} is calling you`,
              data: { type: 'incoming_call', ...callData },
              sound: true,
              categoryIdentifier: 'incoming_call',
            },
            trigger: null,
          });

          if (navigationRef.isReady()) {
            console.log('navigating_to_calling_screen');
            navigate('CallingScreen', {
              callType: 'incoming',
              callerName: callData.callerName,
              callerPhone: callData.callerPhone,
              callerId: callData.callerId,
              callerSocketId: callData.callerSocketId,
              callId: callData.callId,
              meetingId: callData.meetingId,
              meetingToken: callData.meetingToken,
              isVoiceOnly
            });
          } else {
            console.log('navigation_not_ready');
            setTimeout(() => {
              if (navigationRef.isReady()) {
                console.log('retry_navigation');
                navigate('CallingScreen', {
                  callType: 'incoming',
                  callerName: callData.callerName,
                  callerPhone: callData.callerPhone,
                  callerId: callData.callerId,
                  callerSocketId: callData.callerSocketId,
                  callId: callData.callId,
                  meetingId: callData.meetingId,
                  meetingToken: callData.meetingToken,
                  isVoiceOnly
                });
              }
            }, 500);
          }
        },
        onCallAccepted: (data: any) => {
          console.log('call_accepted_notification', data);

          videoCallService.clearPendingCall();

          if (data.accepterSocketId) {
            prepareDirectCall({
              peerId: data.accepterSocketId,
              userId: data.accepterId,
              username: data.accepterName || 'Unknown',
              phoneNumber: data.accepterPhone,
              role: 'caller',
            });
          }

          const isVoiceOnly = data.callType === 'voice';
          const screenName = isVoiceOnly ? 'VoiceCallScreen' : 'VideoCallScreen';

          navigate(screenName, {
            id: data.meetingId || data.callId || 'call_' + Date.now(),
            type: 'outgoing',
            callerId: data.recipientId,
            joinCode: data.meetingId,
            meetingToken: data.meetingToken,
            autoJoinHandled: true
          });

          autoJoinCallerMeeting(data.meetingId, data.meetingToken);
        },
        onCallDeclined: (data: any) => {
          console.log('call_declined_notification', data);

          videoCallService.clearPendingCall();
          logCallHistory('declined');
          endDirectCall();

          goBack();
          Alert.alert('Call Declined', 'The recipient declined your call.');
        },
        onCallCancelled: (data: any) => {
          console.log('call_cancelled_notification', data);

          InCallManager.stopRingtone();
          InCallManager.stop();

          Notifications.dismissAllNotificationsAsync();

          logCallHistory('missed');
          endDirectCall();

          goBack();
        },
        onDirectCallEnded: (data: { endedBy: string; endedByName: string; meetingId?: string }) => {
          console.log('direct_call_ended_notification', data);

          InCallManager.stop();
          Notifications.dismissAllNotificationsAsync();

          logCallHistory('completed');

          peerManager.current?.closeAllConnections();
          meetingManager.current?.leaveMeeting(socketRef.current);
          endDirectCall();

          setCurrentMeetingId(null);
          participantsRef.current = [];
          setParticipants([]);
          setRemoteUser(null);
          setRemoteStream(null);
          setActiveCall(null);
          setRemoteStreams(new Map());

          navigate('HomeScreen', {});
        },
        onJoinRequest: (request) => {
          if (!isMeetingOwnerRef.current) {
            return;
          }
          setPendingJoinRequests(prev => {
            if (prev.some(item => item.requestId === request.requestId)) {
              return prev;
            }
            const next = prev.slice();
            next.push({
              requestId: request.requestId,
              peerId: request.peerId,
              username: request.username,
              userId: request.userId,
            });
            return next;
          });
        },
        onJoinApproved: (data) => {
          if (!meetingManager.current || !socketRef.current) {
            return;
          }
          if (data.requestId) {
            setPendingJoinRequests(prev => prev.filter(item => item.requestId !== data.requestId));
          }
          if (isMeetingOwnerRef.current) {
            return;
          }
          meetingManager.current.finalizeApprovedJoin(data.meetingId, data.participants, socketRef.current);
          setAwaitingHostApproval(false);
          setJoinDeniedReason(null);
        },
        onJoinDenied: (data) => {
          if (data.requestId) {
            setPendingJoinRequests(prev => prev.filter(item => item.requestId !== data.requestId));
          }
          if (isMeetingOwnerRef.current) {
            return;
          }
          if (meetingManager.current) {
            meetingManager.current.handleJoinDenied();
          }
          setCurrentMeetingId(null);
          currentMeetingIdRef.current = null;
          setAwaitingHostApproval(false);
          setJoinDeniedReason(data.reason || 'Access denied by host');
        }
      });
      peerManager.current.setCallbacks({
        onRemoteStreamAdded: (peerId: string, stream: MediaStream) => {
          console.log('provider_remote_stream', {
            peerId,
            streamId: stream.id,
            trackCount: stream.getTracks().length,
            videoTracks: stream.getVideoTracks().length
          });
          setRemoteStreams(prev => {
            const newMap = new Map(prev);
            newMap.set(peerId, stream);
            console.log('remote_streams_updated', {
              size: newMap.size,
              keys: Array.from(newMap.keys())
            });
            return newMap;
          });
          setRemoteStream(stream);
          const user = participantsRef.current.find(p => p.peerId === peerId);
          console.log('participant_lookup', {
            peerId,
            found: !!user,
            participantCount: participantsRef.current.length,
            participantPeerIds: participantsRef.current.map(p => p.peerId)
          });
          if (user) {
            setRemoteUser(user);
            if (!callContactPhoneRef.current && user.phoneNumbers?.[0]?.number) {
              callContactPhoneRef.current = normalizePhoneNumber(user.phoneNumbers[0].number);
            }
          }
        },
        onConnectionStateChanged: (peerId: string, state: string) => {
          console.log('peer_connection_state_changed', { peerId, state });

          if (state === 'disconnected' || state === 'failed' || state === 'closed') {
            const disconnectedUser = participantsRef.current.find(p => p.peerId === peerId);
            if (disconnectedUser && disconnectedUser.peerId !== peerIdRef.current) {
              console.log('remote_peer_disconnected_logging_history');
              logCallHistory('completed', disconnectedUser);
            }
          }
        },
        onParticipantUpdated: (peerId: string, updates: Partial<User>) => {
          setParticipants(prev => {
            const updated = prev.map(p => p.peerId === peerId ? { ...p, ...updates } : p);
            participantsRef.current = updated;
            return updated;
          });
        }
      });
      meetingManager.current.setCallbacks({
        onMeetingCreated: (meetingId: string) => {
          setCurrentMeetingId(meetingId);
          currentMeetingIdRef.current = meetingId;
          socketManager.current?.setMeetingId(meetingId);
          peerManager.current?.setMeetingId(meetingId);

          if (directCallStateRef.current.active && !callStartTimeRef.current) {
            callStartTimeRef.current = Date.now();
            callTypeRef.current = 'outgoing';
            callHistoryLoggedRef.current = false;
          }
        },
        onMeetingJoined: (meetingId: string, participants: User[]) => {
          console.log('on_meeting_joined', {
            meetingId,
            participantCount: participants.length,
            participantPeerIds: participants.map(p => p.peerId)
          });
          setCurrentMeetingId(meetingId);
          currentMeetingIdRef.current = meetingId;
          socketManager.current?.setMeetingId(meetingId);
          peerManager.current?.setMeetingId(meetingId);
          const currentSocketId = socket?.id || socketRef.current?.id;
          const filteredParticipants = participants.filter(p => p.peerId !== currentSocketId);
          console.log('filtered_participants', {
            currentSocketId,
            filteredCount: filteredParticipants.length,
            filteredPeerIds: filteredParticipants.map(p => p.peerId)
          });
          participantsRef.current = filteredParticipants;
          setParticipants(filteredParticipants);

          if (directCallStateRef.current.active) {
            ensureDirectCallState({ createPeerConnection: true });

            if (!callStartTimeRef.current) {
              callStartTimeRef.current = Date.now();
              if (!callTypeRef.current) {
                callTypeRef.current = 'incoming';
              }
              callHistoryLoggedRef.current = false;
            }
          }
        },
        onParticipantsUpdated: (participants: User[]) => {
          console.log('on_participants_updated', {
            count: participants.length,
            peerIds: participants.map(p => p.peerId)
          });
          const filtered = participants.filter(p => p.peerId !== peerIdRef.current);
          participantsRef.current = filtered;
          setParticipants(filtered);
          if (directCallStateRef.current.active) {
            ensureDirectCallState();
          }
          if (!callContactPhoneRef.current) {
            const remoteWithPhone = participantsRef.current.find(p => !p.isLocal && p.peerId !== peerIdRef.current && p.phoneNumbers?.[0]?.number);
            if (remoteWithPhone) {
              callContactPhoneRef.current = normalizePhoneNumber(remoteWithPhone.phoneNumbers?.[0]?.number);
            }
          }
        },
        onPeerConnectionRequested: (participant: User, isInitiator: boolean) => {
          if (!peerManager.current) {
            return;
          }

          if (directCallStateRef.current.active) {
            const directState = directCallStateRef.current;
            const peerIdMatch = directState.remoteUser?.peerId === participant.peerId;
            const userIdMatch = directState.remoteUser?.userId && participant.userId &&
              directState.remoteUser.userId === participant.userId;

            if (!directState.remoteUser || (!peerIdMatch && !userIdMatch)) {
              return;
            }

            if (userIdMatch && !peerIdMatch) {
              directCallStateRef.current = {
                ...directState,
                remoteUser: { ...directState.remoteUser, peerId: participant.peerId },
              };
            }

            const shouldInitiate = directState.role === 'caller';
            const shouldTrack = !!participant.userId;
            if (shouldTrack) {
              startKeyExchange();
            }
            directCallStateRef.current = {
              ...directCallStateRef.current,
              peerConnectionCreated: true,
            };
            const connectionPromise = peerManager.current.createPeerConnection(participant, shouldInitiate);
            if (connectionPromise && typeof connectionPromise.finally === 'function') {
              connectionPromise
                .catch((error) => {
                  console.log('direct_call_peer_connection_failed', { participant: participant.username, error: error.message });
                  if (error.message === 'encryption_required_but_failed' || error.message === 'encryption_required_but_no_userid') {
                    Alert.alert(
                      'Encryption Error',
                      `Unable to establish secure connection with ${participant.username}.`,
                      [{ text: 'OK' }]
                    );
                  }
                })
                .finally(() => {
                  if (shouldTrack) {
                    finishKeyExchange();
                  }
                });
            } else if (shouldTrack) {
              finishKeyExchange();
            }
            ensureDirectCallState();
            return;
          }

          const exists = participantsRef.current.some(p => p.peerId === participant.peerId);
          if (!exists) {
            console.log('adding_participant_on_pc_request', { peerId: participant.peerId });
            const updated = [...participantsRef.current, participant];
            participantsRef.current = updated;
            setParticipants(updated);
          }

          const shouldTrack = !!participant.userId;
          if (shouldTrack) {
            startKeyExchange();
          }
          const connectionPromise = peerManager.current.createPeerConnection(participant, isInitiator);
          if (connectionPromise && typeof connectionPromise.finally === 'function') {
            connectionPromise
              .catch((error) => {
                console.log('peer_connection_failed', { participant: participant.username, error: error.message });
                if (error.message === 'encryption_required_but_failed') {
                  Alert.alert(
                    'Encryption Failed',
                    `Unable to establish secure connection with ${participant.username}. The call cannot proceed without encryption.`,
                    [{ text: 'OK' }]
                  );
                } else if (error.message === 'encryption_required_but_no_userid') {
                  Alert.alert(
                    'Encryption Required',
                    `Cannot connect to ${participant.username}. Encryption is required but user is not authenticated.`,
                    [{ text: 'OK' }]
                  );
                }
              })
              .finally(() => {
                if (shouldTrack) {
                  finishKeyExchange();
                }
              });
          } else if (shouldTrack) {
            finishKeyExchange();
          }
        }
      });
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        const currentPeerIds = new Set(participants.map(p => p.peerId));
        for (const [peerId] of newMap) {
          if (!currentPeerIds.has(peerId)) {
            newMap.delete(peerId);
          }
        }
        if (newMap.size !== prev.size) {
          return newMap;
        }
        return prev;
      });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [participants]);

  useEffect(() => {
    if (directCallStateRef.current.active) {
      ensureDirectCallState();
    }
  }, [participants, ensureDirectCallState]);

  useEffect(() => {
    currentMeetingIdRef.current = currentMeetingId;
    socketManager.current?.setMeetingId(currentMeetingId || '');
    peerManager.current?.setMeetingId(currentMeetingId || '');
  }, [currentMeetingId]);

  useEffect(() => {
    localStreamRef.current = localStream;
    if (peerManager.current && localStream) {
      peerManager.current.setLocalStream(localStream);
    }
  }, [localStream]);

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  useEffect(() => {
    peerIdRef.current = peerId;
    if (peerManager.current && peerId) {
      peerManager.current.setPeerId(peerId);
    }
    if (meetingManager.current && peerId) {
      meetingManager.current.setPeerId(peerId);
    }
  }, [peerId]);

  useEffect(() => {
    if (meetingManager.current && username) {
      meetingManager.current.setUsername(username);
    }
  }, [username]);

  useEffect(() => {
    const autoConnectSocket = async () => {
      if (socketManager.current && !socket) {
        console.log('auto_connect_start', { hasSocketManager: !!socketManager.current, hasSocket: !!socket });

        try {
          const currentUser = getCurrentUser();

          if (currentUser) {
            console.log('attempting_socket_auto_connect', { uid: currentUser.uid, hasPhone: !!currentUser.phoneNumber, hasEmail: !!currentUser.email });

            let phoneNumber = currentUser.phoneNumber;

            if (!phoneNumber) {
              console.log('fetching_phone_from_firestore', currentUser.uid);
              try {
                const userDoc = await getDoc(doc(firestore, 'users', currentUser.uid));
                if (userDoc.exists()) {
                  phoneNumber = userDoc.data()?.phone;
                  console.log('phone_fetched_from_firestore', { hasPhone: !!phoneNumber });
                } else {
                  console.log('user_doc_not_found', currentUser.uid);
                }
              } catch (error) {
                console.log('failed_to_fetch_phone', error);
              }
            }

            const userDisplayName = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
            console.log('initializing_socket', { displayName: userDisplayName });

            const io = await socketManager.current.initializeSocket(userDisplayName);
            console.log('socket_initialized', { socketId: io.id, connected: io.connected });

            setSocket(io);
            setPeerId(io.id || '');
            peerIdRef.current = io.id || '';
            socketRef.current = io;

            console.log('registering_user', { username: userDisplayName, userId: currentUser.uid, peerId: io.id });
            socketManager.current.registerUser({
              username: userDisplayName,
              userId: currentUser.uid,
              phoneNumber: phoneNumber || undefined,
              peerId: io.id,
              fcmToken: undefined
            });
            console.log('user_registered');

            try {
              console.log('uploading_key_bundle', { userId: currentUser.uid, peerId: io.id });
              const keyBundle = keyManager.createKeyBundle(currentUser.uid, io.id || undefined);
              socketManager.current.uploadKeyBundle(keyBundle);
              console.log('key_bundle_uploaded', { userId: currentUser.uid, peerId: io.id });
            } catch (error) {
              console.log('key_bundle_upload_failed', error);
            }

            pushService.init().then(fcmToken => {
              if (fcmToken && socketManager.current) {
                const platform = Platform.OS === 'ios' ? 'ios' : 'android';
                socketManager.current.updateFcmToken(currentUser.uid, fcmToken, platform);
              }
            });

            callKeepService.init();

            console.log('socket_auto_connected', { uid: currentUser.uid, phone: phoneNumber, socketId: io.id });
          } else {
            console.log('no_user_logged_in');
          }
        } catch (error) {
          console.log('socket_auto_connect_failed', { error: error instanceof Error ? error.message : error, stack: error instanceof Error ? error.stack : undefined });
        }
      } else {
        console.log('auto_connect_skipped', { hasSocketManager: !!socketManager.current, hasSocket: !!socket, reason: !socketManager.current ? 'no_manager' : 'socket_exists' });
      }
    };

    const timer = setTimeout(() => {
      autoConnectSocket();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const initialize = async (currentUsername?: string) => {
    if (socket && socket.connected && localStream) {
      return { socket, localStream };
    }

    const finalUsername = currentUsername || username || 'User';
    setUsername(finalUsername);
    setCurrentUser(finalUsername);

    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      shouldRouteThroughEarpiece: false,
      interruptionMode: 'doNotMix',
    });

    const constraints = {
      audio: true,
      video: {
        facingMode: 'user',
        width: { ideal: 640, min: 320, max: 1280 },
        height: { ideal: 480, min: 240, max: 720 },
        frameRate: { ideal: 30, min: 15, max: 60 },
      },
    };

    let newStream: MediaStream;

    try {
      newStream = await mediaDevices.getUserMedia(constraints);
      setLocalStream(newStream as MediaStream);
      localStreamRef.current = newStream as MediaStream;
    } catch (error: any) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to access camera/microphone: ${message}`);
    }

    try {
      if (!socketManager.current) {
        throw new Error('Socket manager not initialized');
      }

      const io = await socketManager.current.initializeSocket(finalUsername);

      setSocket(io);
      setPeerId(io.id || '');
      peerIdRef.current = io.id || '';
      socketRef.current = io;

      (io as any).localStream = newStream;
      (io as any).currentPeerId = io.id;

      const currentUser = getCurrentUser();

      if (currentUser && socketManager.current) {
        let phoneNumber = currentUser.phoneNumber;

        if (!phoneNumber) {
          try {
            const userDoc = await getDoc(doc(firestore, 'users', currentUser.uid));
            if (userDoc.exists()) {
              phoneNumber = userDoc.data()?.phone;
            }
          } catch (error) {
            console.log('failed_to_fetch_phone');
          }
        }

        socketManager.current.registerUser({
          username: finalUsername,
          userId: currentUser.uid,
          phoneNumber: phoneNumber || undefined,
          peerId: io.id,
          fcmToken: undefined
        });

        try {
          const keyBundle = keyManager.createKeyBundle(currentUser.uid, io.id || undefined);
          socketManager.current.uploadKeyBundle(keyBundle);
          console.log('key_bundle_uploaded', { userId: currentUser.uid, peerId: io.id });
        } catch (error) {
          console.log('key_bundle_upload_failed', error);
        }

        pushService.getToken().then(fcmToken => {
          if (fcmToken && socketManager.current) {
            const platform = Platform.OS === 'ios' ? 'ios' : 'android';
            socketManager.current.updateFcmToken(currentUser.uid, fcmToken, platform);
          }
        });

        console.log('user_registered', currentUser.uid, phoneNumber);
      } else if (socketManager.current) {
        try {
          const keyBundle = keyManager.createKeyBundle(undefined, io.id || undefined);
          socketManager.current.uploadKeyBundle(keyBundle);
          console.log('key_bundle_uploaded', { userId: null, peerId: io.id });
        } catch (error) {
          console.log('key_bundle_upload_failed', error);
        }
      }

      setIsInitialized(true);
      return { socket: io, localStream: newStream };
    } catch (error) {
      throw error;
    }
  };

  const createMeeting = (): Promise<string> => {
    if (!meetingManager.current || !socket) {
      return Promise.reject('Not properly initialized');
    }
    return meetingManager.current.createMeeting(socket).then(meetingId => {
      setIsMeetingOwner(true);
      isMeetingOwnerRef.current = true;
      setPendingJoinRequests([]);
      setAwaitingHostApproval(false);
      setJoinDeniedReason(null);
      return meetingId;
    });
  };

  const createMeetingWithSocket = (socketToUse: any): Promise<string> => {
    if (!meetingManager.current) {
      return Promise.reject('Meeting manager not initialized');
    }
    return meetingManager.current.createMeeting(socketToUse).then(meetingId => {
      setIsMeetingOwner(true);
      isMeetingOwnerRef.current = true;
      setPendingJoinRequests([]);
      setAwaitingHostApproval(false);
      setJoinDeniedReason(null);
      return meetingId;
    });
  };

  const joinMeeting = (
    meetingId: string,
    socketToUse?: any,
    meetingToken?: string,
    userId?: string
  ): Promise<boolean> => {
    if (!meetingManager.current) {
      return Promise.reject('Meeting manager not initialized');
    }
    const activeSocket = socketToUse || socket;
    setIsMeetingOwner(false);
    isMeetingOwnerRef.current = false;
    setPendingJoinRequests([]);
    setJoinDeniedReason(null);

    if (directCallStateRef.current.active && !callStartTimeRef.current) {
      callStartTimeRef.current = Date.now();
      callTypeRef.current = 'incoming';
      callHistoryLoggedRef.current = false;
    }

    return meetingManager.current.joinMeeting(
      meetingId,
      activeSocket,
      meetingToken,
      userId
    ).then(result => {
      const pending = meetingManager.current?.isAwaitingApproval() || false;
      setAwaitingHostApproval(pending);
      if (pending) {
        setCurrentMeetingId(meetingId);
        currentMeetingIdRef.current = meetingId;
      } else {
        setJoinDeniedReason(null);
      }
      return result;
    }).catch(error => {
      setAwaitingHostApproval(false);
      callStartTimeRef.current = null;
      callTypeRef.current = null;
      throw error;
    });
  };

  const leaveMeeting = (skipHistory = false, contactOverride?: User) => {
    const wasDirectCall = directCallStateRef.current.active;
    const remoteUserId = directCallStateRef.current.remoteUser?.userId;
    const meetingId = currentMeetingIdRef.current;

    if (wasDirectCall && socketManager.current) {
      socketManager.current.endDirectCall({
        meetingId: meetingId || undefined,
        recipientUserId: remoteUserId,
      });
    }

    endDirectCall();
    meetingManager.current?.leaveMeeting(socket);
    peerManager.current?.closeAllConnections();

    if (!skipHistory) {
      logCallHistory('completed', contactOverride);
    }

    setCurrentMeetingId(null);
    participantsRef.current = [];
    setParticipants([]);
    setRemoteUser(null);
    setRemoteStream(null);
    setActiveCall(null);
    setRemoteStreams(new Map());
    setPendingJoinRequests([]);
    setAwaitingHostApproval(false);
    setJoinDeniedReason(null);
    setIsMeetingOwner(false);
    isMeetingOwnerRef.current = false;
    callContactPhoneRef.current = null;
  };

  const logCallHistory = async (status: 'completed' | 'missed' | 'declined' | 'failed', contactOverride?: User) => {
    const currentUser = getCurrentUser();

    if (callHistoryLoggedRef.current) {
      console.log('log_call_history_skipped_already_logged');
      return;
    }

    if (!currentUser) {
      console.log('log_call_history_skipped_no_user');
      return;
    }

    if (!callStartTimeRef.current) {
      console.log('log_call_history_skipped_no_start_time');
      return;
    }

    if (!callContactPhoneRef.current) {
      console.log('log_call_history_skipped_not_direct_call');
      callStartTimeRef.current = null;
      callTypeRef.current = null;
      return;
    }

    const duration = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
    const remoteParticipants = participants.filter(p => !p.isLocal && p.peerId !== peerIdRef.current);
    const contact = contactOverride || remoteUser || remoteParticipants[0];
    if (!contact) {
      console.log('log_call_history_skipped_no_contact');
      return;
    }

    try {
      const hasEncryption = contact.peerId
        ? e2eStatus?.activeSessions?.includes(contact.peerId) || false
        : false;

      console.log('saving_call_history', {
        userId: currentUser.uid,
        contactName: contact.username || contact.name || 'Unknown',
        type: callTypeRef.current,
        duration,
        status,
      });

      await callHistoryService.addCallToHistory({
        userId: currentUser.uid,
        contactId: contact.userId || contact.id || contact.peerId,
        contactName: contact.username || contact.name || 'Unknown',
        contactPhone: callContactPhoneRef.current || normalizePhoneNumber(contact.phoneNumbers?.[0]?.number) || undefined,
        type: callTypeRef.current || 'outgoing',
        duration: status === 'completed' ? duration : 0,
        timestamp: callStartTimeRef.current,
        status,
        meetingId: currentMeetingIdRef.current || undefined,
        encrypted: hasEncryption,
      });

      console.log('call_history_saved_successfully');
      callHistoryLoggedRef.current = true;
      callContactPhoneRef.current = null;
    } catch (error) {
      console.log('log_call_history_failed', error);
    } finally {
      callStartTimeRef.current = null;
      callTypeRef.current = null;
    }
  };

  const call = (user: User) => {
    if (!socket || !localStream) {
      return;
    }

    setRemoteUser(user);

    if (!callStartTimeRef.current) {
      callStartTimeRef.current = Date.now();
      callTypeRef.current = 'outgoing';
      callHistoryLoggedRef.current = false;
    }
    callContactPhoneRef.current = normalizePhoneNumber(user.phoneNumbers?.[0]?.number);

    if (!peerManager.current) {
      return;
    }
    const shouldTrack = !!user.userId;
    if (shouldTrack) {
      startKeyExchange();
    }
    const connectionPromise = peerManager.current.createPeerConnection(user, true);
    if (connectionPromise && typeof connectionPromise.finally === 'function') {
      connectionPromise
        .catch((error) => {
          console.log('direct_call_failed', { user: user.username, error: error.message });
          if (error.message === 'encryption_required_but_failed') {
            Alert.alert(
              'Encryption Failed',
              `Unable to establish secure connection with ${user.username}. The call cannot proceed without encryption.`,
              [{ text: 'OK' }]
            );
          } else if (error.message === 'encryption_required_but_no_userid') {
            Alert.alert(
              'Encryption Required',
              `Cannot connect to ${user.username}. Encryption is required but user is not authenticated.`,
              [{ text: 'OK' }]
            );
          }
          setRemoteUser(null);
        })
        .finally(() => {
          if (shouldTrack) {
            finishKeyExchange();
          }
        });
    } else if (shouldTrack) {
      finishKeyExchange();
    }
  };

  const switchCamera = async () => {
    if (!localStream) return;

    const newFacingMode = facingModeRef.current === 'user' ? 'environment' : 'user';

    try {
      const constraints = {
        audio: false,
        video: {
          facingMode: newFacingMode,
          width: { ideal: 640, min: 320, max: 1280 },
          height: { ideal: 480, min: 240, max: 720 },
          frameRate: { ideal: 30, min: 15, max: 60 },
        },
      };

      const newVideoStream = await mediaDevices.getUserMedia(constraints);
      const newVideoTrack = newVideoStream.getVideoTracks()[0];

      if (!newVideoTrack) return;

      if (peerManager.current) {
        await peerManager.current.replaceVideoTrack(newVideoTrack);
      }

      const oldVideoTracks = localStream.getVideoTracks();
      const audioTracks = localStream.getAudioTracks();

      oldVideoTracks.forEach(track => track.stop());

      const updatedStream = new MediaStream([
        ...audioTracks,
        newVideoTrack,
      ]);

      setLocalStream(updatedStream);
      localStreamRef.current = updatedStream;

      if (peerManager.current) {
        peerManager.current.setLocalStream(updatedStream);
      }

      facingModeRef.current = newFacingMode;
    } catch (err) {
      console.log('switch_camera_error', err);
    }
  };

  const toggleMute = () => {
    if (!localStream) {
      return;
    }
    const audioTracks = localStream.getAudioTracks();
    if (audioTracks.length === 0) {
      return;
    }
    const newMutedState = !isMuted;
    audioTracks.forEach((track) => {
      track.enabled = !newMutedState;
    });
    setIsMuted(newMutedState);
  };

  const approveJoinRequest = (requestId: string) => {
    if (!socketManager.current || !currentMeetingIdRef.current) {
      return;
    }
    try {
      socketManager.current.respondToJoinRequest(currentMeetingIdRef.current, requestId, true);
      setPendingJoinRequests(prev => prev.filter(item => item.requestId !== requestId));
    } catch (error) {
      console.log('approve_join_request_failed', error);
    }
  };

  const denyJoinRequest = (requestId: string) => {
    if (!socketManager.current || !currentMeetingIdRef.current) {
      return;
    }
    try {
      socketManager.current.respondToJoinRequest(currentMeetingIdRef.current, requestId, false);
      setPendingJoinRequests(prev => prev.filter(item => item.requestId !== requestId));
    } catch (error) {
      console.log('deny_join_request_failed', error);
    }
  };

  const acknowledgeJoinDenied = () => {
    setJoinDeniedReason(null);
  };

  const closeCall = () => {
    peerManager.current?.closeAllConnections();

    const contact = remoteUser || participants.find(p => !p.isLocal);
    logCallHistory('completed', contact);

    setActiveCall(null);
    setRemoteUser(null);
    setRemoteStream(null);
    setRemoteStreams(new Map());

    leaveMeeting(true);
  };

  const reset = async () => {
    if (socketManager.current) {
      socketManager.current.disconnect();
    }
    setSocket(null);
    socketRef.current = null;
    peerManager.current?.closeAllConnections();
    leaveMeeting(true);
    endDirectCall();
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
      });
    }
    setLocalStream(null);
    localStreamRef.current = null;
    setRemoteStream(null);
    setRemoteStreams(new Map());
    setIsInitialized(false);
    setCurrentUser(null);
    setUsername('');
    setPeerId('');
    peerIdRef.current = '';
    setActiveCall(null);
    setRemoteUser(null);
    participantsRef.current = [];
    setParticipants([]);
    setUsers([]);
    setCurrentMeetingId(null);
    currentMeetingIdRef.current = null;
    setIsMuted(false);
    setPendingJoinRequests([]);
    setAwaitingHostApproval(false);
    setJoinDeniedReason(null);
    setIsMeetingOwner(false);
    isMeetingOwnerRef.current = false;

    socketManager.current = null;
    peerManager.current = null;
    meetingManager.current = null;
  };

  const refreshParticipantVideo = async (participantPeerId: string): Promise<void> => {

    const participant = participantsRef.current.find(p => p.peerId === participantPeerId);
    if (!participant) {
      return;
    }
    meetingManager.current?.updateParticipant(participantPeerId, { isRefreshing: true });

    try {
      peerManager.current?.closePeerConnection(participantPeerId);
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        newMap.delete(participantPeerId);
        return newMap;
      });
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (!peerManager.current) {
        return;
      }
      const shouldTrack = !!participant.userId;
      if (shouldTrack) {
        startKeyExchange();
      }
      const connectionPromise = peerManager.current.createPeerConnection(participant, true);
      if (connectionPromise && typeof connectionPromise.finally === 'function') {
        connectionPromise
          .catch((error) => {
            console.log('refresh_participant_failed', { participant: participant.username, error: error.message });
            if (error.message === 'encryption_required_but_failed' || error.message === 'encryption_required_but_no_userid') {
              Alert.alert(
                'Reconnection Failed',
                `Unable to re-establish secure connection with ${participant.username}. Encryption is required.`,
                [{ text: 'OK' }]
              );
            }
          })
          .finally(() => {
            if (shouldTrack) {
              finishKeyExchange();
            }
          });
      } else if (shouldTrack) {
        finishKeyExchange();
      }
    } catch (_error) {
    } finally {
      meetingManager.current?.updateParticipant(participantPeerId, { isRefreshing: false });
    }
  };

  const getSecurityCode = (peerId: string): string | undefined => {
    return sessionManager.getSecurityCode(peerId);
  };

  const replaceAudioTrack = async (track: any): Promise<boolean> => {
    if (!peerManager.current) {
      console.log('replace_track_no_manager');
      return false;
    }
    return peerManager.current.replaceAudioTrack(track);
  };

  const restoreOriginalAudio = async (): Promise<boolean> => {
    if (!peerManager.current) {
      console.log('restore_audio_no_manager');
      return false;
    }
    return peerManager.current.restoreOriginalAudio();
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const activeSessions = sessionManager.getActiveSessions();
      const securityCodes = new Map<string, string>();

      activeSessions.forEach(peerId => {
        const code = sessionManager.getSecurityCode(peerId);
        if (code) {
          securityCodes.set(peerId, code);
        }
      });

      setE2EStatus(prev => ({
        ...prev,
        activeSessions,
        securityCodes,
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const contextValue: WebRTCContextType = {
    localStream,
    remoteStreams,
    isInitialized,
    currentUser,
    activeCall,
    remoteUser,
    participants,
    socket,
    meetingId: currentMeetingId,
    peerId,
    currentMeetingId,
    remoteStream,
    isMuted,
    users,
    socketManager,
    e2eStatus,
    initialize,
    reset,
    createMeeting,
    createMeetingWithSocket,
    joinMeeting,
    refreshParticipantVideo,
    setUsername: (newUsername: string) => setUsername(newUsername),
    leaveMeeting,
    call,
    closeCall,
    switchCamera,
    toggleMute,
    getSecurityCode,
    replaceAudioTrack,
    restoreOriginalAudio,
    pendingJoinRequests,
    approveJoinRequest,
    denyJoinRequest,
    awaitingHostApproval,
    isMeetingOwner,
    joinDeniedReason,
    acknowledgeJoinDenied,
    prepareDirectCall,
    endDirectCall,
    isDirectCallActive,
  };

  return (
    <WebRTCContext.Provider value={contextValue}>
      {children}
    </WebRTCContext.Provider>
  );
};

export default WebRTCProvider;
