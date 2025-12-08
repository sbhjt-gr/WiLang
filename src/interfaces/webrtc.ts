import {MediaStream} from '@sbhjt-gr/react-native-webrtc';

export interface User {
  username: string;
  peerId: string;
  id?: string;
  name?: string;
  phoneNumbers?: { number?: string; }[];
  isLocal?: boolean;
  hasActiveConnection?: boolean;
  hasActiveStream?: boolean;
  isRefreshing?: boolean;
}

export interface WebRTCContext {
  username: string;
  setUsername: React.Dispatch<React.SetStateAction<string>>;
  peerId: string;
  setPeerId?: React.Dispatch<React.SetStateAction<string>>;
  users: User[];
  setUsers?: React.Dispatch<React.SetStateAction<User[]>>;
  localStream: MediaStream | null;
  setLocalStream?: React.Dispatch<React.SetStateAction<MediaStream | null>>;
  remoteStream: MediaStream | null;
  setRemoteStream?: React.Dispatch<React.SetStateAction<MediaStream | null>>;
  remoteStreams: Map<string, MediaStream>;
  setRemoteStreams?: React.Dispatch<React.SetStateAction<Map<string, MediaStream>>>;
  initialize: (username?: string) => void;
  call: (user: User) => void;
  switchCamera: () => void;
  toggleMute: () => void;
  isMuted: boolean;
  closeCall: () => void;
  reset: () => void;
  remoteUser: User | null;
  activeCall: any;
  createMeeting: () => Promise<string>;
  createMeetingWithSocket: (socket: any) => Promise<string>;
  joinMeeting: (meetingId: string, socketToUse?: any) => Promise<boolean>;
  leaveMeeting: () => void;
  refreshParticipantVideo: (participantPeerId: string) => Promise<void>;
  currentMeetingId: string | null;
  participants: User[];
}