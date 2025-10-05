import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@rneui/themed';
import { StackNavigationProp } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { RootStackParamList } from '../types/navigation';
import CallsScreen from './tabs/CallsScreen';
import ContactsScreen from './tabs/ContactsScreen';
import HistoryScreen from './tabs/HistoryScreen';
import SettingsScreen from './tabs/SettingsScreen';

type TabNavigatorNavigationProp = StackNavigationProp<RootStackParamList, 'HomeScreen'>;

interface Props {
  navigation: TabNavigatorNavigationProp;
}

type TabType = 'calls' | 'contacts' | 'history' | 'settings';

interface TabItem {
  key: TabType;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
}

const tabs: TabItem[] = [
  {
    key: 'calls',
    title: 'Calls',
    icon: 'videocam-outline',
    iconFocused: 'videocam',
  },
  {
    key: 'contacts',
    title: 'Contacts',
    icon: 'people-outline',
    iconFocused: 'people',
  },
  {
    key: 'history',
    title: 'History',
    icon: 'time-outline',
    iconFocused: 'time',
  },
  {
    key: 'settings',
    title: 'Settings',
    icon: 'settings-outline',
    iconFocused: 'settings',
  },
];

export default function TabNavigator({ navigation }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('calls');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'calls':
        return <CallsScreen navigation={navigation} />;
      case 'contacts':
        return <ContactsScreen />;
      case 'history':
        return <HistoryScreen />;
      case 'settings':
        return <SettingsScreen navigation={navigation} />;
      default:
        return <CallsScreen navigation={navigation} />;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="transparent" translucent />
      <View style={styles.content}>{renderTabContent()}</View>
      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        <BlurView intensity={72} tint="dark" style={styles.tabBar}>
          {tabs.map(tab => {
            const focused = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabItem, focused && styles.tabItemActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={focused ? tab.iconFocused : tab.icon}
                  size={20}
                  color={focused ? '#ffffff' : '#8c8ea0'}
                />
                <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{tab.title}</Text>
              </TouchableOpacity>
            );
          })}
        </BlurView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05060a',
  },
  content: {
    flex: 1,
  },
  safeArea: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 28,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(12, 14, 24, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 8,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 8,
  },
  tabItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8c8ea0',
    marginLeft: 6,
  },
  tabLabelActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
