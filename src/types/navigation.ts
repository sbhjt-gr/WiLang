export type RootStackParamList = {
  LoginScreen: undefined;
  HomeScreen: { signedUp?: number };
  RegisterScreen: undefined;
  AccountLoadingScreen: { from?: 'login' | 'register' | 'app_launch'; signedUp?: number } | undefined;
  PhoneNumberScreen: { from: 'login' | 'register' | 'app_launch' };
  VideoCallScreen: { 
    id: string; 
    type?: 'join' | 'create' | 'incoming' | 'outgoing' | 'instant'; 
    joinCode?: string;
    meetingToken?: string;
    autoJoinHandled?: boolean;
  };
  CallingScreen: { 
    callType: 'outgoing' | 'incoming';
    callerName: string;
    callerPhone?: string;
    callerImage?: string;
    callerId?: string;
    callerSocketId?: string;
    callId?: string;
    meetingId?: string;
    meetingToken?: string;
  };
  UsersScreen: undefined;
  EnvironmentConfig: undefined;
  ThemeSettingsScreen: undefined;
  TranslationSettingsScreen: undefined;
  CallTranslationSettings: undefined;
};

export type TabParamList = {
  CallsTab: undefined;
  ContactsTab: undefined;
  HistoryTab: undefined;
  SettingsTab: undefined;
}; 