import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Text, Image, Modal, Pressable, Animated } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types/navigation';
import CallsScreen from './tabs/CallsScreen';
import ContactsScreen from './tabs/ContactsScreen';
import HistoryScreen from './tabs/HistoryScreen';
import SettingsScreen from './tabs/SettingsScreen';
import { useTheme } from '../theme';

type TabNavigatorNavigationProp = StackNavigationProp<RootStackParamList, 'HomeScreen'>;
type TabNavigatorRouteProp = RouteProp<RootStackParamList, 'HomeScreen'>;

interface Props {
  navigation: TabNavigatorNavigationProp;
  route: TabNavigatorRouteProp;
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

export default function TabNavigator({ navigation, route }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('calls');
  const [showNotifications, setShowNotifications] = useState(false);
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showNotifications) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 8,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showNotifications, scaleAnim, fadeAnim]);

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'calls': return 'WiLang';
      case 'contacts': return 'Contacts';
      case 'history': return 'Call History';
      case 'settings': return 'Settings';
      default: return 'WiLang';
    }
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" backgroundColor="#8b5cf6" />

      <View style={[styles.headerContainer, { backgroundColor: '#8b5cf6' }]}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={styles.logoContainer}>
                <Image 
                  source={require('../../assets/icon.png')} 
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.headerButton}>
                <Ionicons name="search-outline" size={20} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={() => setShowNotifications(true)}
              >
                <Ionicons name="notifications-outline" size={20} color="#ffffff" />
                <View style={styles.notificationBadge}>
                  <View style={[styles.notificationDot, { backgroundColor: '#dc2626' }]} />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <Modal
        visible={showNotifications}
        transparent
        animationType="none"
        onRequestClose={() => setShowNotifications(false)}
      >
        <Animated.View style={[styles.notificationOverlay, { opacity: fadeAnim }]}>
          <Pressable 
            style={StyleSheet.absoluteFill} 
            onPress={() => setShowNotifications(false)}
          />
          <Animated.View 
            style={[
              styles.notificationPanelContainer,
              { 
                transform: [
                  { scale: scaleAnim },
                ],
                opacity: scaleAnim,
              }
            ]}
          >
            <View style={styles.notificationArrowContainer}>
              <View style={[styles.notificationArrow, { borderBottomColor: colors.surface }]} />
            </View>
            <Pressable onPress={() => {}}>
              <View style={[styles.notificationPanel, { backgroundColor: colors.surface }]}>
                <View style={styles.notificationHeader}>
                  <Text style={[styles.notificationTitle, { color: colors.text }]}>Notifications</Text>
                  <TouchableOpacity onPress={() => setShowNotifications(false)}>
                    <Ionicons name="close" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.notificationContent}>
                  <Ionicons name="notifications-off-outline" size={48} color={colors.textTertiary} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No notifications</Text>
                </View>
              </View>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </Modal>

      <View style={[styles.content, { backgroundColor: colors.background }]}>
        {renderTabContent()}
      </View>

      <SafeAreaView edges={['bottom']}>
        <View style={[styles.tabBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab.key)}
            >
              <View style={[styles.tabIconContainer, activeTab === tab.key && styles.tabIconContainerActive]}>
                <Ionicons
                  name={activeTab === tab.key ? tab.iconFocused : tab.icon}
                  size={22}
                  color={activeTab === tab.key ? '#8b5cf6' : colors.textTertiary}
                />
              </View>
              <Text style={[
                styles.tabLabel,
                { color: colors.textTertiary },
                activeTab === tab.key && { color: '#8b5cf6', fontWeight: '600' }
              ]}>
                {tab.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1000,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  logoImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    flex: 1,
    marginTop: -12,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabIconContainer: {
    marginBottom: 4,
  },
  tabIconContainerActive: {
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  tabLabelActive: {
  },
  notificationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  notificationPanelContainer: {
    position: 'absolute',
    top: 50,
    right: 10,
    left: 16,
    transformOrigin: 'top right',
  },
  notificationArrowContainer: {
    alignItems: 'flex-end',
    paddingRight: 20,
  },
  notificationArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  notificationPanel: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  notificationTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  notificationContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
  },
});
