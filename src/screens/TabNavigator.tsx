import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
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
  const animatedValues = useRef<Record<TabType, Animated.Value>>(
    tabs.reduce((acc, tab) => {
      acc[tab.key] = new Animated.Value(tab.key === 'calls' ? 1 : 0);
      return acc;
    }, {} as Record<TabType, Animated.Value>)
  ).current;

  const animateTab = (key: TabType) => {
    tabs.forEach(tab => {
      Animated.spring(animatedValues[tab.key], {
        toValue: tab.key === key ? 1 : 0,
        useNativeDriver: true,
        damping: tab.key === key ? 12 : 18,
        stiffness: tab.key === key ? 210 : 160,
        mass: 1
      }).start();
    });
  };

  const handleTabPress = (key: TabType) => {
    setActiveTab(key);
    animateTab(key);
  };

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
            const animatedStyle = {
              transform: [
                {
                  translateY: animatedValues[tab.key].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -14]
                  })
                },
                {
                  scale: animatedValues[tab.key].interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.08]
                  })
                }
              ]
            };

            return (
              <Animated.View key={tab.key} style={[styles.tabItem, animatedStyle]}>
                <TouchableOpacity
                  style={[styles.tabButton, focused && styles.tabButtonActive]}
                  onPress={() => handleTabPress(tab.key)}
                  activeOpacity={0.9}
                >
                  <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
                    <Ionicons
                      name={focused ? tab.iconFocused : tab.icon}
                      size={18}
                      color={focused ? '#0b0d1a' : '#b7bad0'}
                    />
                  </View>
                </TouchableOpacity>
              </Animated.View>
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
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: 'rgba(12, 14, 24, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  tabButton: {
    width: '100%',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingVertical: 10,
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  iconWrapperActive: {
    backgroundColor: '#0b0d1a',
  },
});
