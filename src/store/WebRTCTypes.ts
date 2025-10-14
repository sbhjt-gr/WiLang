import {MediaStream} from 'react-native-webrtc';

export interface User {
  id: string;
  username: string;
  peerId: string;
  name?: string;
  phoneNumbers?: {number?: string}[];
  emails?: {email?: string}[];
  isLocal?: boolean;
  hasActiveConnection?: boolean;
  isRefreshing?: boolean;
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
  initialize: (username?: string) => Promise<any>;
  reset: () => Promise<void>;
  createMeeting: () => Promise<string>;
  createMeetingWithSocket: (socket: any) => Promise<string>;
  joinMeeting: (meetingId: string, socket?: any) => Promise<boolean>;
  refreshParticipantVideo: (participantPeerId: string) => Promise<void>;
  setUsername: (username: string) => void;
  leaveMeeting: () => void;
  call: (user: User) => void;
  closeCall: () => void;
  switchCamera: () => void;
  toggleMute: () => void;
}
