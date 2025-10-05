import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text } from '@rneui/themed';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/navigation';
import { auth } from '../../config/firebase';

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'HomeScreen'>;

interface Props {
  navigation: SettingsScreenNavigationProp;
}
export default function SettingsScreen({ navigation }: Props) {
  const email = auth.currentUser?.email ?? 'Unknown user';
  const initials = email[0]?.toUpperCase() ?? 'U';

  const handleSignOut = () => {
    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            try {
              await auth.signOut();
              navigation.replace('LoginScreen');
            } catch {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Manage your account and device information.</Text>
      </View>
      <View style={styles.identityCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.identityDetails}>
          <Text style={styles.identityLabel}>Signed in as</Text>
          <Text style={styles.identityValue}>{email}</Text>
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={styles.actionRow} onPress={handleSignOut} activeOpacity={0.85}>
          <Text style={styles.actionText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c10',
    paddingHorizontal: 24,
    paddingTop: 24
  },
  header: {
    marginBottom: 24
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f4f5f9',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    color: '#9da3bd'
  },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1f2234',
    padding: 16,
    marginBottom: 32,
    backgroundColor: '#131522'
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f2340',
    marginRight: 16
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f4f5f9'
  },
  identityDetails: {
    flex: 1
  },
  identityLabel: {
    fontSize: 12,
    color: '#858aa5',
    marginBottom: 6
  },
  identityValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f4f5f9'
  },
  section: {
    flex: 1
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f4f5f9',
    marginBottom: 16
  },
  actionRow: {
    borderRadius: 14,
    backgroundColor: '#1a1d2c',
    paddingVertical: 16,
    paddingHorizontal: 18
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ff6b6b'
  }
});
