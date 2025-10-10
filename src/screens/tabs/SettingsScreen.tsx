import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text } from '@rneui/themed';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/navigation';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../config/firebase';

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'HomeScreen'>;

interface Props {
  navigation: SettingsScreenNavigationProp;
}

export default function SettingsScreen({ navigation }: Props) {
  const LogOut = async (): Promise<void> => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Sign Out", 
          style: "destructive",
          onPress: async () => {
            try {
              await auth.signOut();
              navigation.replace("LoginScreen");
            } catch (error) {
              Alert.alert("Error", "Failed to sign out. Please try again.");
            }
          }
        }
      ]
    );
  };

  const settingsOptions = [
    {
      id: 1,
      title: 'Notifications',
      subtitle: 'Manage call notifications',
      icon: 'notifications-outline' as const,
      color: '#667eea',
      onPress: () => {}
    },
    {
      id: 2,
      title: 'Audio & Video',
      subtitle: 'Camera and microphone settings',
      icon: 'videocam-outline' as const,
      color: '#10b981',
      onPress: () => {}
    },
    {
      id: 3,
      title: 'Privacy',
      subtitle: 'Privacy and security settings',
      icon: 'shield-outline' as const,
      color: '#f59e0b',
      onPress: () => {}
    },
    {
      id: 4,
      title: 'About',
      subtitle: 'App version and information',
      icon: 'information-circle-outline' as const,
      color: '#8b5cf6',
      onPress: () => {}
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileSection}>
          <View style={styles.profileCard}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.profileGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>U</Text>
              </View>
              <Text style={styles.userName}>User Name</Text>
              <Text style={styles.userEmail}>{auth.currentUser?.email || 'user@example.com'}</Text>
            </LinearGradient>
          </View>
        </View>

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          {settingsOptions.map((option, index) => (
            <View 
              key={option.id}
              style={styles.settingCard}
            >
              <TouchableOpacity 
                style={styles.settingItem}
                onPress={option.onPress}
              >
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIcon, { backgroundColor: `${option.color}20` }]}>
                    <Ionicons name={option.icon} size={20} color={option.color} />
                  </View>
                  <View style={styles.settingText}>
                    <Text style={styles.settingTitle}>{option.title}</Text>
                    <Text style={styles.settingSubtitle}>{option.subtitle}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutCard} onPress={LogOut}>
            <LinearGradient
              colors={['#ff6b6b', '#ee5a52']}
              style={styles.logoutGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="log-out-outline" size={20} color="#ffffff" />
              <Text style={styles.logoutText}>Sign Out</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  profileSection: {
    marginBottom: 32,
  },
  profileCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  profileGradient: {
    alignItems: 'center',
    padding: 32,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  settingsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  settingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  logoutSection: {
    marginTop: 20,
  },
  logoutCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
});
