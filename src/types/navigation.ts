export type RootStackParamList = {
  LoginScreen: undefined;
  HomeScreen: { signedUp?: number };
  RegisterScreen: undefined;
  PhoneCheckScreen: { from: 'login' | 'register'; signedUp: number };
  PhoneNumberScreen: { from: 'login' | 'register' };
  VideoCallScreen: { id: string; type?: 'join' | 'create' | 'incoming' | 'outgoing' | 'instant'; joinCode?: string };
  UsersScreen: undefined;
  EnvironmentConfig: undefined;
  ThemeSettingsScreen: undefined;
};

export type TabParamList = {
  CallsTab: undefined;
  ContactsTab: undefined;
  HistoryTab: undefined;
  SettingsTab: undefined;
}; 