import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Animated, TouchableOpacity, Alert, Linking, FlatList, TextInput, ActivityIndicator, Platform, RefreshControl, Image } from 'react-native';
import { Text } from '@rneui/themed';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { videoCallService } from '../../services/VideoCallService';
import { useNavigation } from '@react-navigation/native';

interface Contact {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phoneNumbers?: { number?: string; }[];
  emails?: { email?: string; }[];
  imageUri?: string;
}

interface ContactsScreenProps {
  navigation?: any;
}

export default function ContactsScreen({ navigation }: ContactsScreenProps) {
  const navigationHook = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<'undetermined' | 'granted' | 'denied'>('undetermined');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
    
    checkInitialPermissionStatus();
  }, []);

  const checkInitialPermissionStatus = async () => {
    try {
      const { status } = await Contacts.getPermissionsAsync();
      setPermissionStatus(status);
      
      if (status === 'granted') {
        loadContacts();
      }
    } catch {
      Alert.alert('Error', 'Unable to verify contacts permission. Please try again.');
    }
  };

  const requestContactsPermission = async () => {
    try {
      setHasRequestedPermission(true);
      const { status } = await Contacts.requestPermissionsAsync();
      setPermissionStatus(status);
      
      if (status === 'granted') {
        await loadContacts();
      } else if (status === 'denied') {
        Alert.alert(
          'Contacts Permission Required',
          'To access your contacts, please enable contacts permission in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
      }
    } catch {
      Alert.alert('Error', 'Failed to request contacts permission. Please try again.');
    }
  };

  const loadContacts = async () => {
    try {
      setIsLoading(true);
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.FirstName,
          Contacts.Fields.LastName,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
          Contacts.Fields.Image,
        ],
        sort: Contacts.SortTypes.FirstName,
      });

      const filteredContacts = data
        .filter(contact => contact.name && (contact.phoneNumbers?.length || contact.emails?.length))
        .map(contact => ({
          id: contact.id || Math.random().toString(),
          name: contact.name || 'Unknown',
          firstName: contact.firstName,
          lastName: contact.lastName,
          phoneNumbers: contact.phoneNumbers,
          emails: contact.emails,
          imageUri: contact.image?.uri,
        }));

      setContacts(filteredContacts);
    } catch {
      Alert.alert('Error', 'Failed to load contacts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    if (permissionStatus === 'granted') {
      setRefreshing(true);
      await loadContacts();
      setRefreshing(false);
    }
  };

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    
    return contacts.filter(contact => {
      const query = searchQuery.toLowerCase();
      const name = contact.name.toLowerCase();
      const phoneNumber = contact.phoneNumbers?.[0]?.number?.replace(/[^0-9]/g, '') || '';
      
      return name.includes(query) || phoneNumber.includes(query);
    });
  }, [contacts, searchQuery]);

  const handleContactPress = (contact: Contact) => {
    const phoneNumber = contact.phoneNumbers?.[0]?.number;
    
    if (!phoneNumber) {
      Alert.alert('No Phone Number', 'This contact does not have a phone number.');
      return;
    }

    Alert.alert(
      contact.name,
      'Choose an action:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Voice Call',
          onPress: () => handleVoiceCall(phoneNumber)
        },
        {
          text: 'Video Call',
          onPress: () => handleVideoCall(contact)
        }
      ]
    );
  };

  const handleVoiceCall = (phoneNumber: string) => {
    const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanNumber}`);
  };

  const handleVideoCall = async (contact: Contact) => {
    try {
      if (navigationHook) {
        videoCallService.setNavigationRef({ current: navigationHook });
      }
      
      await videoCallService.startVideoCall(contact);
    } catch {
      Alert.alert('Error', 'Failed to start video call. Please try again.');
    }
  };

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const renderPermissionRequest = () => (
    <Animated.View 
      style={[
        styles.permissionContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.permissionCard}>
        <Ionicons name="people-outline" size={64} color="#667eea" style={styles.permissionIcon} />
        <Text style={styles.permissionTitle}>Access Your Contacts</Text>
        <Text style={styles.permissionDescription}>
          WhisperLang needs permission to access your contacts to help you connect with friends and family.
        </Text>
        <TouchableOpacity 
          style={styles.permissionButton}
          onPress={requestContactsPermission}
        >
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.permissionGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="checkmark-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.permissionButtonText}>Allow Access</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        {hasRequestedPermission && permissionStatus === 'denied' && (
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => Linking.openSettings()}
          >
            <Ionicons name="settings-outline" size={16} color="#667eea" style={{ marginRight: 6 }} />
            <Text style={styles.settingsButtonText}>Open Settings</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );

  const renderContact = ({ item: contact, index }: { item: Contact; index: number }) => (
    <TouchableOpacity 
      style={styles.contactCard}
      onPress={() => handleContactPress(contact)}
      activeOpacity={0.7}
    >
      <View style={styles.contactInfo}>
        {contact.imageUri ? (
          <Image source={{ uri: contact.imageUri }} style={styles.contactImage} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: getAvatarColor(index) }]}>
            <Text style={styles.avatarText}>{getInitials(contact.name)}</Text>
          </View>
        )}
        <View style={styles.contactDetails}>
          <Text style={styles.contactName} numberOfLines={1}>{contact.name}</Text>
          {contact.phoneNumbers?.[0]?.number && (
            <Text style={styles.phoneNumber} numberOfLines={1}>
              {contact.phoneNumbers[0].number}
            </Text>
          )}
        </View>
      </View>
      <TouchableOpacity 
        style={styles.callButton}
        onPress={(e) => {
          e.stopPropagation();
          handleVideoCall(contact);
        }}
      >
        <Ionicons name="videocam-outline" size={20} color="#667eea" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <Animated.View 
      style={[
        styles.emptyContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <Ionicons name="people-outline" size={64} color="#9ca3af" />
      <Text style={styles.emptyTitle}>No Contacts Found</Text>
      <Text style={styles.emptyDescription}>
        {searchQuery ? 'No contacts match your search.' : 'Your contacts will appear here.'}
      </Text>
    </Animated.View>
  );

  if (permissionStatus === 'undetermined' || (permissionStatus === 'denied' && !hasRequestedPermission)) {
    return (
      <SafeAreaView style={styles.container}>
        {renderPermissionRequest()}
      </SafeAreaView>
    );
  }

  if (permissionStatus === 'denied') {
    return (
      <SafeAreaView style={styles.container}>
        <Animated.View 
          style={[
            styles.deniedContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.deniedCard}>
            <Ionicons name="ban-outline" size={64} color="#ef4444" />
            <Text style={styles.deniedTitle}>Contacts Permission Denied</Text>
            <Text style={styles.deniedDescription}>
              To use contacts, please enable permission in your device settings.
            </Text>
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={() => Linking.openSettings()}
            >
              <Ionicons name="settings-outline" size={16} color="#667eea" style={{ marginRight: 6 }} />
              <Text style={styles.settingsButtonText}>Open Settings</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View 
        style={[
          styles.searchContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle-outline" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      <Animated.View 
        style={[
          styles.headerContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <Text style={styles.sectionTitle}>
          {contacts.length > 0 ? `${contacts.length} Contact${contacts.length !== 1 ? 's' : ''}` : 'Contacts'}
        </Text>
        {contacts.length > 0 && (
          <TouchableOpacity onPress={onRefresh} disabled={refreshing}>
            <Ionicons 
              name="refresh-outline" 
              size={20} 
              color={refreshing ? "#9ca3af" : "#667eea"} 
            />
          </TouchableOpacity>
        )}
      </Animated.View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredContacts}
          renderItem={renderContact}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#667eea']}
              tintColor="#667eea"
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const getAvatarColor = (index: number) => {
  const colors = ['#667eea', '#ff9a9e', '#a8edea', '#fecfef', '#764ba2', '#fad0c4', '#a8e6cf', '#ffecd2', '#fcb69f'];
  return colors[index % colors.length];
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  permissionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
  },
  permissionIcon: {
    marginBottom: 24,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  permissionDescription: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  permissionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: 12,
  },
  settingsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
  },
  
  deniedContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  deniedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
  },
  deniedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  deniedDescription: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  
  searchContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  clearButton: {
    padding: 4,
  },
  
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  contactCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  phoneNumber: {
    fontSize: 14,
    color: '#6b7280',
  },
  callButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
  },
  separator: {
    height: 12,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4b5563',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 24,
  },
});
