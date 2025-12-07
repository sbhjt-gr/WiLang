import React, {useState, useRef, useEffect} from 'react';
import {mediaDevices, MediaStream} from '@livekit/react-native-webrtc';
import {WebRTCContext} from './WebRTCContext';
import {User, WebRTCContextType, E2EStatus, JoinRequest} from './WebRTCTypes';
import {WebRTCSocketManager} from './WebRTCSocketManager';
import {WebRTCPeerManager} from './WebRTCPeerManager';
import {WebRTCMeetingManager} from './WebRTCMeetingManager';
import { keyManager, sessionManager } from '../crypto';
import { callHistoryService } from '../services/CallHistoryService';

interface Props {
  children: React.ReactNode;
}

const WebRTCProvider: React.FC<Props> = ({children}) => {
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

  const socketManager = useRef<WebRTCSocketManager | null>(null);
  const peerManager = useRef<WebRTCPeerManager | null>(null);
  const meetingManager = useRef<WebRTCMeetingManager | null>(null);
  const callerJoinInProgressRef = useRef(false);
  const keyExchangeCounterRef = useRef(0);

  const normalizePhoneNumber = (phone: string | undefined | null): string | null => {
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
  };

  const startKeyExchange = () => {
    keyExchangeCounterRef.current += 1;
    setE2EStatus(prev => ({ ...prev, keyExchangeInProgress: true }));
  };

  const finishKeyExchange = () => {
    keyExchangeCounterRef.current = Math.max(0, keyExchangeCounterRef.current - 1);
    if (keyExchangeCounterRef.current === 0) {
      setE2EStatus(prev => ({ ...prev, keyExchangeInProgress: false }));
    }
  };

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
      const { auth } = require('../config/firebase');
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
          leaveMeeting(false, contact);
        },
        onUsersChange: (users: User[]) => {
          setUsers(users);
        },
        onIncomingCall: (callData: any) => {
          console.log('incoming_call_received', callData);
          
          if (!callStartTimeRef.current) {
            callStartTimeRef.current = Date.now();
            callTypeRef.current = 'incoming';
            callHistoryLoggedRef.current = false;
          }
          callContactPhoneRef.current = normalizePhoneNumber(callData.callerPhone);
          
          const { navigationRef, navigate } = require('../utils/navigationRef');
          
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
              meetingToken: callData.meetingToken
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
                  meetingToken: callData.meetingToken
                });
              }
            }, 500);
          }
        },
        onCallAccepted: (data: any) => {
          console.log('call_accepted_notification', data);
          const { navigationRef } = require('../utils/navigationRef');
          if (navigationRef.current) {
            navigationRef.current.navigate('VideoCallScreen', {
              id: data.meetingId || data.callId || 'call_' + Date.now(),
              type: 'outgoing',
              callerId: data.recipientId,
              joinCode: data.meetingId,
              meetingToken: data.meetingToken,
              autoJoinHandled: true
            });
          }

          autoJoinCallerMeeting(data.meetingId, data.meetingToken);
        },
        onCallDeclined: (data: any) => {
          console.log('call_declined_notification', data);
          
          logCallHistory('declined');
          
          const { navigationRef } = require('../utils/navigationRef');
          const { Alert } = require('react-native');
          if (navigationRef.current) {
            navigationRef.current.goBack();
          }
          Alert.alert('Call Declined', 'The recipient declined your call.');
        },
        onCallCancelled: (data: any) => {
          console.log('call_cancelled_notification', data);
          
          logCallHistory('missed');
          
          const { navigationRef } = require('../utils/navigationRef');
          const { Alert } = require('react-native');
          if (navigationRef.current) {
            navigationRef.current.goBack();
          }
          Alert.alert('Call Cancelled', 'The caller cancelled the call.');
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
          setRemoteStreams(prev => {
            const newMap = new Map(prev);
            newMap.set(peerId, stream);
            return newMap;
          });
          setRemoteStream(stream);
          const user = participants.find(p => p.peerId === peerId);
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
            const disconnectedUser = participants.find(p => p.peerId === peerId);
            if (disconnectedUser && disconnectedUser.peerId !== peerIdRef.current) {
              console.log('remote_peer_disconnected_logging_history');
              logCallHistory('completed', disconnectedUser);
            }
          }
        },
        onParticipantUpdated: (peerId: string, updates: Partial<User>) => {
          setParticipants(prev =>
            prev.map(p => p.peerId === peerId ? { ...p, ...updates } : p)
          );
        }
      });
      meetingManager.current.setCallbacks({
        onMeetingCreated: (meetingId: string) => {
          setCurrentMeetingId(meetingId);
          currentMeetingIdRef.current = meetingId;
          socketManager.current?.setMeetingId(meetingId);
          peerManager.current?.setMeetingId(meetingId);
          
          if (!callStartTimeRef.current) {
            callStartTimeRef.current = Date.now();
            callTypeRef.current = 'outgoing';
            callHistoryLoggedRef.current = false;
          }
        },
        onMeetingJoined: (meetingId: string, participants: User[]) => {
          setCurrentMeetingId(meetingId);
          currentMeetingIdRef.current = meetingId;
          socketManager.current?.setMeetingId(meetingId);
          peerManager.current?.setMeetingId(meetingId);
          const currentSocketId = socket?.id;
          const filteredParticipants = participants.filter(p => p.peerId !== currentSocketId);
          setParticipants(filteredParticipants);
          
          if (!callStartTimeRef.current) {
            callStartTimeRef.current = Date.now();
            if (!callTypeRef.current) {
              callTypeRef.current = 'incoming';
            }
            callHistoryLoggedRef.current = false;
          }
        },
        onParticipantsUpdated: (participants: User[]) => {
          setParticipants(participants);
          if (!callContactPhoneRef.current) {
            const remoteWithPhone = participants.find(p => !p.isLocal && p.peerId !== peerIdRef.current && p.phoneNumbers?.[0]?.number);
            if (remoteWithPhone) {
              callContactPhoneRef.current = normalizePhoneNumber(remoteWithPhone.phoneNumbers?.[0]?.number);
            }
          }
        },
        onPeerConnectionRequested: (participant: User, isInitiator: boolean) => {
          if (!peerManager.current) {
            return;
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
                  const { Alert } = require('react-native');
                  Alert.alert(
                    'Encryption Failed',
                    `Unable to establish secure connection with ${participant.username}. The call cannot proceed without encryption.`,
                    [{ text: 'OK' }]
                  );
                } else if (error.message === 'encryption_required_but_no_userid') {
                  const { Alert } = require('react-native');
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
          const { getCurrentUser } = require('../services/FirebaseService');
          const { doc, getDoc } = require('firebase/firestore');
          const { firestore } = require('../config/firebase');
          
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
      return {socket, localStream};
    }

    const finalUsername = currentUsername || username || 'User';
    setUsername(finalUsername);
    setCurrentUser(finalUsername);
    
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

      const { getCurrentUser } = require('../services/FirebaseService');
      const { doc, getDoc } = require('firebase/firestore');
      const { firestore } = require('../config/firebase');
      
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
      return {socket: io, localStream: newStream};
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
    
    if (!callStartTimeRef.current) {
      callStartTimeRef.current = Date.now();
      callTypeRef.current = meetingToken ? 'incoming' : 'incoming';
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
    meetingManager.current?.leaveMeeting(socket);
    peerManager.current?.closeAllConnections();
    
    if (!skipHistory) {
      logCallHistory('completed', contactOverride);
    }
    
    setCurrentMeetingId(null);
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
    const { getCurrentUser } = require('../services/FirebaseService');
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
            const { Alert } = require('react-native');
            Alert.alert(
              'Encryption Failed',
              `Unable to establish secure connection with ${user.username}. The call cannot proceed without encryption.`,
              [{ text: 'OK' }]
            );
          } else if (error.message === 'encryption_required_but_no_userid') {
            const { Alert } = require('react-native');
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

  const switchCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        const trackWithSwitch = track as typeof track & {_switchCamera?: () => void};
        if (typeof trackWithSwitch._switchCamera === 'function') {
          trackWithSwitch._switchCamera();
        }
      });
    }
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
        setIsMuted(!track.enabled);
      });
    }
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
    
    const participant = participants.find(p => p.peerId === participantPeerId);
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
              const { Alert } = require('react-native');
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
    pendingJoinRequests,
    approveJoinRequest,
    denyJoinRequest,
    awaitingHostApproval,
    isMeetingOwner,
    joinDeniedReason,
    acknowledgeJoinDenied,
  };

  return (
    <WebRTCContext.Provider value={contextValue}>
      {children}
    </WebRTCContext.Provider>
  );
};

export default WebRTCProvider;
