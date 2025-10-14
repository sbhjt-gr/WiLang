import React, {useState, useRef, useEffect} from 'react';
import {mediaDevices, MediaStream} from 'react-native-webrtc';
import {WebRTCContext} from './WebRTCContext';
import {User, WebRTCContextType} from './WebRTCTypes';
import {WebRTCSocketManager} from './WebRTCSocketManager';
import {WebRTCPeerManager} from './WebRTCPeerManager';
import {WebRTCMeetingManager} from './WebRTCMeetingManager';

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

  const localStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<any>(null);
  const peerIdRef = useRef<string>('');
  const currentMeetingIdRef = useRef<string | null>(null);

  const socketManager = useRef<WebRTCSocketManager | null>(null);
  const peerManager = useRef<WebRTCPeerManager | null>(null);
  const meetingManager = useRef<WebRTCMeetingManager | null>(null);

  useEffect(() => {
    if (!socketManager.current) {
      socketManager.current = new WebRTCSocketManager();
      peerManager.current = new WebRTCPeerManager(socketManager.current);
      meetingManager.current = new WebRTCMeetingManager();
      socketManager.current.setCallbacks({
        onUserJoined: (user: User) => {
          meetingManager.current?.handleUserJoined(user);
        },
        onUserLeft: (user: User) => {
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
          leaveMeeting();
        },
        onUsersChange: (users: User[]) => {
          setUsers(users);
        },
        onIncomingCall: (callData: any) => {
          console.log('incoming_call_received', callData);
          const { navigationRef, navigate } = require('../utils/navigationRef');
          
          if (navigationRef.isReady()) {
            console.log('navigating_to_calling_screen');
            navigate('CallingScreen', {
              callType: 'incoming',
              callerName: callData.callerName,
              callerPhone: callData.callerPhone,
              callerId: callData.callerId,
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
              meetingToken: data.meetingToken
            });
          }
        },
        onCallDeclined: (data: any) => {
          console.log('call_declined_notification', data);
          const { navigationRef } = require('../utils/navigationRef');
          const { Alert } = require('react-native');
          if (navigationRef.current) {
            navigationRef.current.goBack();
          }
          Alert.alert('Call Declined', 'The recipient declined your call.');
        },
        onCallCancelled: (data: any) => {
          console.log('call_cancelled_notification', data);
          const { navigationRef } = require('../utils/navigationRef');
          const { Alert } = require('react-native');
          if (navigationRef.current) {
            navigationRef.current.goBack();
          }
          Alert.alert('Call Cancelled', 'The caller cancelled the call.');
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
          }
        },
        onConnectionStateChanged: () => {},
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
        },
        onMeetingJoined: (meetingId: string, participants: User[]) => {
          setCurrentMeetingId(meetingId);
          currentMeetingIdRef.current = meetingId;
          socketManager.current?.setMeetingId(meetingId);
          peerManager.current?.setMeetingId(meetingId);
          const currentSocketId = socket?.id;
          const filteredParticipants = participants.filter(p => p.peerId !== currentSocketId);
          setParticipants(filteredParticipants);
        },
        onParticipantsUpdated: (participants: User[]) => {
          setParticipants(participants);
        },
        onPeerConnectionRequested: (participant: User, isInitiator: boolean) => {
          if (peerManager.current) {
            peerManager.current.createPeerConnection(participant, isInitiator);
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
        try {
          const { getCurrentUser } = require('../services/FirebaseService');
          const { doc, getDoc } = require('firebase/firestore');
          const { firestore } = require('../config/firebase');
          
          const currentUser = getCurrentUser();
          
          if (currentUser) {
            console.log('attempting_socket_auto_connect', currentUser.uid);
            
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
            
            const userDisplayName = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
            const io = await socketManager.current.initializeSocket(userDisplayName);
            
            setSocket(io);
            setPeerId(io.id || '');
            peerIdRef.current = io.id || '';
            socketRef.current = io;
            
            socketManager.current.registerUser({
              username: userDisplayName,
              userId: currentUser.uid,
              phoneNumber: phoneNumber || undefined,
              peerId: io.id,
              fcmToken: undefined
            });
            
            console.log('socket_auto_connected', currentUser.uid, phoneNumber);
          } else {
            console.log('no_user_logged_in');
          }
        } catch (error) {
          console.log('socket_auto_connect_failed', error);
        }
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
        console.log('user_registered', currentUser.uid, phoneNumber);
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
    return meetingManager.current.createMeeting(socket);
  };

  const createMeetingWithSocket = (socketToUse: any): Promise<string> => {
    if (!meetingManager.current) {
      return Promise.reject('Meeting manager not initialized');
    }
    return meetingManager.current.createMeeting(socketToUse);
  };

  const joinMeeting = (meetingId: string, socketToUse?: any): Promise<boolean> => {
    if (!meetingManager.current) {
      return Promise.reject('Meeting manager not initialized');
    }
    const activeSocket = socketToUse || socket;
    return meetingManager.current.joinMeeting(meetingId, activeSocket);
  };

  const leaveMeeting = () => {
    meetingManager.current?.leaveMeeting(socket);
    peerManager.current?.closeAllConnections();
    
    setCurrentMeetingId(null);
    setParticipants([]);
    setRemoteUser(null);
    setRemoteStream(null);
    setActiveCall(null);
    setRemoteStreams(new Map());
  };

  const call = (user: User) => {
    if (!socket || !localStream) {
      return;
    }

    setRemoteUser(user);
    peerManager.current?.createPeerConnection(user, true);
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

  const closeCall = () => {
    peerManager.current?.closeAllConnections();
    
    setActiveCall(null);
    setRemoteUser(null);
    setRemoteStream(null);
    setRemoteStreams(new Map());
    
    leaveMeeting();
  };

  const reset = async () => {
    if (socketManager.current) {
      socketManager.current.disconnect();
    }
    setSocket(null);
    socketRef.current = null;
    peerManager.current?.closeAllConnections();
    leaveMeeting();
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
      peerManager.current?.createPeerConnection(participant, true);
    } catch (_error) {
    } finally {
      meetingManager.current?.updateParticipant(participantPeerId, { isRefreshing: false });
    }
  };

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
  };

  return (
    <WebRTCContext.Provider value={contextValue}>
      {children}
    </WebRTCContext.Provider>
  );
};

export default WebRTCProvider;
