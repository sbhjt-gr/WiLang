export interface ParticipantProfile {
  id: string;
  name: string;
  avatar: string;
}

export interface FeaturedCall {
  id: string;
  title: string;
  subtitle: string;
  backgroundImage: string;
  logo: string;
  languages: string[];
  participants: ParticipantProfile[];
}

export interface CallProfile {
  id: string;
  name: string;
  avatar: string;
  status: string;
  languages: string[];
  lastInteraction: string;
}

export interface CallRow {
  rowTitle: string;
  type: 'live' | 'favorites' | 'recent' | 'language';
  profiles: CallProfile[];
}

export interface CallData {
  featuredCall: FeaturedCall;
  rows: CallRow[];
}
