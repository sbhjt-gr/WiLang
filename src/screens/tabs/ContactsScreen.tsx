import React, { useRef, useEffect, useState, useMemo, useContext } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert, Linking, FlatList, TextInput, ActivityIndicator, Platform, RefreshControl, Image } from 'react-native';
import { Text } from '@rneui/themed';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { videoCallService } from '../../services/VideoCallService';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { WebRTCContext } from '../../store/WebRTCContext';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { firestore, auth } from '../../config/firebase';

interface Contact {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phoneNumbers?: { number?: string; }[];
  emails?: { email?: string; }[];
  imageUri?: string;
  registeredPhone?: string;
  registeredUserId?: string;
}

interface ContactsScreenProps {
  navigation?: any;
}

export default function ContactsScreen({ navigation }: ContactsScreenProps) {
  const navigationHook = useNavigation();
  const { colors } = useTheme();
  const webRTCContext = useContext(WebRTCContext);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<'undetermined' | 'granted' | 'denied'>('undetermined');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(false);

  useEffect(() => {
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
      setIsLoading(false);

      checkRegisteredContacts(filteredContacts);

    } catch {
      Alert.alert('Error', 'Failed to load contacts. Please try again.');
      setIsLoading(false);
    }
  };

  const normalizePhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    }
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return `+${cleaned}`;
    }
    if (cleaned.length === 13 && cleaned.startsWith('091')) {
      return `+${cleaned.substring(1)}`;
    }
    return phone;
  };

  const checkRegisteredContacts = async (contactsList: Contact[]) => {
    try {
      setIsCheckingRegistration(true);
      const phoneNumbers: string[] = [];
      const phoneToContactMap = new Map<string, Contact>();

      for (const contact of contactsList) {
        if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
          const phoneNumber = contact.phoneNumbers[0].number;
          if (phoneNumber) {
            const normalizedPhone = normalizePhoneNumber(phoneNumber);
            phoneNumbers.push(normalizedPhone);
            phoneToContactMap.set(normalizedPhone, contact);
          }
        }
      }

      const batchSize = 10;
      for (let i = 0; i < phoneNumbers.length; i += batchSize) {
        const batch = phoneNumbers.slice(i, i + batchSize);
        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where('phone', 'in', batch));
        const querySnapshot = await getDocs(q);

        querySnapshot.docs.forEach(doc => {
          const userData = doc.data();
          const contact = phoneToContactMap.get(userData.phone);
          if (contact) {
            contact.registeredPhone = userData.phone;
            contact.registeredUserId = doc.id;
          }
        });

        setContacts([...contactsList]);
      }

      setIsCheckingRegistration(false);
    } catch (error) {
      console.error('check_registered_contacts_error', error);
      setIsCheckingRegistration(false);
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

    const actions = [
      { text: 'Cancel', style: 'cancel' as const },
      {
        text: 'Voice Call',
        onPress: () => handleVoiceCall(phoneNumber)
      }
    ];

    if (contact.registeredUserId && contact.registeredPhone) {
      actions.push({
        text: 'Video Call',
        onPress: () => handleVideoCall(contact)
      });
    }

    Alert.alert(
      contact.name,
      contact.registeredUserId ? 'WiLang User - Choose an action:' : 'Choose an action:',
      actions
    );
  };

  const handleVoiceCall = (phoneNumber: string) => {
    const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanNumber}`);
  };

  const handleVideoCall = async (contact: Contact) => {
    try {
      if (!contact.registeredUserId || !contact.registeredPhone) {
        Alert.alert('Not Available', 'This contact is not registered on WiLang.');
        return;
      }

      if (!webRTCContext) {
        Alert.alert('Error', 'WebRTC service not available.');
        return;
      }

      if (navigationHook) {
        videoCallService.setNavigationRef({ current: navigationHook });
      }

      await videoCallService.startVideoCallWithPhone(
        contact.registeredUserId,
        contact.registeredPhone,
        contact.name
      );
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
    <View
      style={styles.permissionContainer}
    >
      <View style={[styles.permissionCard, { backgroundColor: colors.surface }]}>
        <Ionicons name="people-outline" size={64} color={colors.primary} style={styles.permissionIcon} />
        <Text style={[styles.permissionTitle, { color: colors.text }]}>Access Your Contacts</Text>
        <Text style={[styles.permissionDescription, { color: colors.textSecondary }]}>
          WiLang needs permission to access your contacts to help you connect with friends and family.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestContactsPermission}
        >
          <LinearGradient
            colors={colors.gradient1}
            style={styles.permissionGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="checkmark-outline" size={20} color={colors.textInverse} style={{ marginRight: 8 }} />
            <Text style={[styles.permissionButtonText, { color: colors.textInverse }]}>Allow Access</Text>
          </LinearGradient>
        </TouchableOpacity>

        {hasRequestedPermission && permissionStatus === 'denied' && (
          <TouchableOpacity
            style={[styles.settingsButton, { backgroundColor: colors.primaryLight }]}
            onPress={() => Linking.openSettings()}
          >
            <Ionicons name="settings-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.settingsButtonText, { color: colors.primary }]}>Open Settings</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderContact = ({ item: contact, index }: { item: Contact; index: number }) => (
    <TouchableOpacity
      style={[styles.contactCard, { backgroundColor: colors.surface }]}
      onPress={() => handleContactPress(contact)}
      activeOpacity={0.7}
    >
      <View style={styles.contactInfo}>
        {contact.imageUri ? (
          <Image source={{ uri: contact.imageUri }} style={styles.contactImage} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: getAvatarColor(index) }]}>
            <Text style={[styles.avatarText, { color: colors.textInverse }]}>{getInitials(contact.name)}</Text>
          </View>
        )}
        <View style={styles.contactDetails}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.contactName, { color: colors.text }]} numberOfLines={1}>{contact.name}</Text>
            {contact.registeredUserId && (
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
            )}
          </View>
          {contact.phoneNumbers?.[0]?.number && (
            <Text style={[styles.phoneNumber, { color: colors.textSecondary }]} numberOfLines={1}>
              {contact.phoneNumbers[0].number}
            </Text>
          )}
        </View>
      </View>
      {contact.registeredUserId && contact.registeredPhone && (
        <TouchableOpacity
          style={[styles.callButton, { backgroundColor: colors.primaryLight }]}
          onPress={(e) => {
            e.stopPropagation();
            handleVideoCall(contact);
          }}
        >
          <Ionicons name="videocam-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View
      style={styles.emptyContainer}
    >
      <Ionicons name="people-outline" size={64} color={colors.textTertiary} />
      <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No Contacts Found</Text>
      <Text style={[styles.emptyDescription, { color: colors.textTertiary }]}>
        {searchQuery ? 'No contacts match your search.' : 'Your contacts will appear here.'}
      </Text>
    </View>
  );

  if (permissionStatus === 'undetermined' || (permissionStatus === 'denied' && !hasRequestedPermission)) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {renderPermissionRequest()}
      </SafeAreaView>
    );
  }

  if (permissionStatus === 'denied') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View
          style={styles.deniedContainer}
        >
          <View style={[styles.deniedCard, { backgroundColor: colors.surface }]}>
            <Ionicons name="ban-outline" size={64} color={colors.error} />
            <Text style={[styles.deniedTitle, { color: colors.error }]}>Contacts Permission Denied</Text>
            <Text style={[styles.deniedDescription, { color: colors.textSecondary }]}>
              To use contacts, please enable permission in your device settings.
            </Text>
            <TouchableOpacity
              style={[styles.settingsButton, { backgroundColor: colors.primaryLight }]}
              onPress={() => Linking.openSettings()}
            >
              <Ionicons name="settings-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.settingsButtonText, { color: colors.primary }]}>Open Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={styles.searchContainer}
      >
        <View style={[styles.searchInputContainer, { backgroundColor: colors.surface }]}>
          <Ionicons name="search-outline" size={20} color={colors.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search contacts..."
            placeholderTextColor={colors.textTertiary}
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
              <Ionicons name="close-circle-outline" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View
        style={styles.headerContainer}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {contacts.length > 0 ? `${contacts.length} Contact${contacts.length !== 1 ? 's' : ''}` : 'Contacts'}
        </Text>
        {contacts.length > 0 && (
          <TouchableOpacity onPress={onRefresh} disabled={refreshing}>
            <Ionicons
              name="refresh-outline"
              size={20}
              color={refreshing ? colors.textTertiary : colors.primary}
            />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading contacts...</Text>
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
              colors={[colors.primary]}
              tintColor={colors.primary}
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
  },

  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  permissionCard: {
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
    textAlign: 'center',
    marginBottom: 12,
  },
  permissionDescription: {
    fontSize: 16,
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
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  settingsButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  deniedContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  deniedCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
  },
  deniedTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  deniedDescription: {
    fontSize: 16,
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
  },
  
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  contactCard: {
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
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  phoneNumber: {
    fontSize: 14,
  },
  callButton: {
    padding: 12,
    borderRadius: 12,
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
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
