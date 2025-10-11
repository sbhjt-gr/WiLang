export type RootStackParamList = {
  LoginScreen: undefined;
  HomeScreen: { signedUp?: number };
  RegisterScreen: undefined;
  VideoCallScreen: { id: string; type?: 'join' | 'create' | 'incoming' | 'outgoing' | 'instant'; joinCode?: string };
  UsersScreen: undefined;
  EnvironmentConfig: undefined;
  ModelSettings: undefined;
};

export type TabParamList = {
  CallsTab: undefined;
  ContactsTab: undefined;
  HistoryTab: undefined;
  SettingsTab: undefined;
}; 