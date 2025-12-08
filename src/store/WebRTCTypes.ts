import {MediaStream} from '@livekit/react-native-webrtc';

export interface User {
  id: string;
  username: string;
  peerId: string;
  userId?: string;
  name?: string;
  phoneNumbers?: {number?: string}[];
  emails?: {email?: string}[];
  isLocal?: boolean;
  hasActiveConnection?: boolean;
  isRefreshing?: boolean;
}

export interface E2EStatus {
  initialized: boolean;
  keyExchangeInProgress: boolean;
  activeSessions: string[];
  securityCodes: Map<string, string>;
}

export interface JoinRequest {
  requestId: string;
  peerId: string;
  username: string;
  userId?: string;
}

export interface WebRTCContextType {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  isInitialized: boolean;
  currentUser: string | null;
  activeCall: string | null;
  remoteUser: User | null;
  participants: User[];
  socket: any;
  meetingId: string | null;
  peerId: string | null;
  currentMeetingId?: string | null;
  remoteStream?: MediaStream | null;
  isMuted?: boolean;
  users?: User[];
  socketManager?: any;
  e2eStatus?: E2EStatus;
  initialize: (username?: string) => Promise<any>;
  reset: () => Promise<void>;
  createMeeting: () => Promise<string>;
  createMeetingWithSocket: (socket: any) => Promise<string>;
  joinMeeting: (meetingId: string, socket?: any, meetingToken?: string, userId?: string) => Promise<boolean>;
  refreshParticipantVideo: (participantPeerId: string) => Promise<void>;
  setUsername: (username: string) => void;
  leaveMeeting: () => void;
  call: (user: User) => void;
  closeCall: () => void;
  switchCamera: () => void;
  toggleMute: () => void;
  getSecurityCode?: (peerId: string) => string | undefined;
  replaceAudioTrack?: (track: any) => Promise<boolean>;
  restoreOriginalAudio?: () => Promise<boolean>;
  pendingJoinRequests?: JoinRequest[];
  approveJoinRequest?: (requestId: string) => void;
  denyJoinRequest?: (requestId: string) => void;
  awaitingHostApproval?: boolean;
  isMeetingOwner?: boolean;
  joinDeniedReason?: string | null;
  acknowledgeJoinDenied?: () => void;
}
