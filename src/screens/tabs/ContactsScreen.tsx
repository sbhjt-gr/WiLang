import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	View,
	StyleSheet,
	TouchableOpacity,
	Alert,
	Linking,
	FlatList,
	TextInput,
	ActivityIndicator,
	RefreshControl,
	Image
} from 'react-native';
import { Text } from '@rneui/themed';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { videoCallService } from '../../services/VideoCallService';

interface Contact {
	id: string;
	name: string;
	firstName?: string;
	lastName?: string;
	phoneNumbers?: { number?: string }[];
	emails?: { email?: string }[];
	imageUri?: string;
}

export default function ContactsScreen() {
	const navigationHook = useNavigation<any>();
	const [contacts, setContacts] = useState<Contact[]>([]);
	const [permissionStatus, setPermissionStatus] = useState<'undetermined' | 'granted' | 'denied'>('undetermined');
	const [isLoading, setIsLoading] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [refreshing, setRefreshing] = useState(false);
	const [hasRequestedPermission, setHasRequestedPermission] = useState(false);

	const loadContacts = useCallback(async () => {
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
	}, []);

	const checkInitialPermissionStatus = useCallback(async () => {
		try {
			const { status } = await Contacts.getPermissionsAsync();
			setPermissionStatus(status);

			if (status === 'granted') {
				loadContacts();
			}
		} catch {
			Alert.alert('Error', 'Unable to verify contacts permission. Please try again.');
		}
	}, [loadContacts]);

	useEffect(() => {
		checkInitialPermissionStatus();
	}, [checkInitialPermissionStatus]);

	const requestContactsPermission = async () => {
		try {
			setHasRequestedPermission(true);
			const { status } = await Contacts.requestPermissionsAsync();
			setPermissionStatus(status);

			if (status === 'granted') {
				await loadContacts();
			} else if (status === 'denied') {
				Alert.alert(
					'Contacts permission required',
					'Enable contacts permission in settings to sync your directory.',
					[
						{ text: 'Cancel', style: 'cancel' },
						{ text: 'Open settings', onPress: () => Linking.openSettings() },
					]
				);
			}
		} catch {
			Alert.alert('Error', 'Failed to request contacts permission. Please try again.');
		}
	};

	const onRefresh = useCallback(async () => {
		if (permissionStatus === 'granted') {
			setRefreshing(true);
			try {
				await loadContacts();
			} finally {
				setRefreshing(false);
			}
		}
	}, [loadContacts, permissionStatus]);

	const filteredContacts = useMemo(() => {
		if (!searchQuery.trim()) {
			return contacts;
		}

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
			Alert.alert('No phone number', 'This contact does not have a phone number.');
			return;
		}

		Alert.alert(contact.name, 'Choose an action:', [
			{ text: 'Cancel', style: 'cancel' },
			{ text: 'Voice call', onPress: () => handleVoiceCall(phoneNumber) },
			{ text: 'Video call', onPress: () => handleVideoCall(contact) },
		]);
	};

	const handleVoiceCall = (phoneNumber: string) => {
		const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');
		Linking.openURL(`tel:${cleanNumber}`);
	};

	const handleVideoCall = async (contact: Contact) => {
		try {
			videoCallService.setNavigationRef({ current: navigationHook });
			await videoCallService.startVideoCall(contact);
		} catch {
			Alert.alert('Error', 'Failed to start video call. Please try again.');
		}
	};

	const getInitials = (name: string) => {
		const names = name.trim().split(' ').filter(Boolean);
		if (names.length >= 2) {
			return (names[0][0] + names[1][0]).toUpperCase();
		}
		return name.substring(0, 2).toUpperCase();
	};

	const goToDirectory = () => {
		navigationHook.navigate('UsersScreen');
	};

	const heroSubtitle = useMemo(() => {
		if (contacts.length === 0) {
			return 'Grant access to sync your address book and see who is ready to connect.';
		}
		if (searchQuery.trim() && filteredContacts.length === 0) {
			return 'No matches found. Clear your search or sync to refresh your list.';
		}
		return `${contacts.length} saved contact${contacts.length === 1 ? '' : 's'} ready for calls.`;
	}, [contacts.length, filteredContacts.length, searchQuery]);

	const renderPermissionRequest = () => (
		<View style={styles.permissionCard}>
			<Ionicons name="people-outline" size={48} color="#5560f6" />
			<Text style={styles.permissionTitle}>Sync your contacts</Text>
			<Text style={styles.permissionDescription}>
				Allow access to invite people from your address book.
			</Text>
			<TouchableOpacity style={styles.permissionButton} onPress={requestContactsPermission} activeOpacity={0.85}>
				<Text style={styles.permissionButtonText}>Grant permission</Text>
			</TouchableOpacity>
			{hasRequestedPermission && permissionStatus === 'denied' && (
				<TouchableOpacity style={styles.permissionLink} onPress={() => Linking.openSettings()} activeOpacity={0.85}>
					<Text style={styles.permissionLinkText}>Open settings</Text>
				</TouchableOpacity>
			)}
		</View>
	);

	const renderContact = ({ item: contact }: { item: Contact }) => (
		<TouchableOpacity style={styles.contactRow} onPress={() => handleContactPress(contact)} activeOpacity={0.85}>
			<View style={styles.contactAvatar}>
				{contact.imageUri ? (
					<Image source={{ uri: contact.imageUri }} style={styles.contactImage} />
				) : (
					<Text style={styles.contactInitials}>{getInitials(contact.name)}</Text>
				)}
			</View>
			<View style={styles.contactTextBlock}>
				<Text style={styles.contactName} numberOfLines={1}>
					{contact.name}
				</Text>
				{contact.phoneNumbers?.[0]?.number && (
					<Text style={styles.contactNumber} numberOfLines={1}>
						{contact.phoneNumbers[0].number}
					</Text>
				)}
			</View>
			<Ionicons name="chevron-forward" size={18} color="#6b6f87" />
		</TouchableOpacity>
	);

	const renderEmptyState = () => (
		<View style={styles.emptyContainer}>
			<Ionicons name="people-circle-outline" size={48} color="#5560f6" />
			<Text style={styles.emptyTitle}>No contacts found</Text>
			<Text style={styles.emptyDescription}>
				{searchQuery ? 'Try a different search.' : 'Grant access or sync to view your saved contacts.'}
			</Text>
		</View>
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
				<View style={styles.deniedCard}>
					<Ionicons name="ban-outline" size={48} color="#ff6b6b" />
					<Text style={styles.deniedTitle}>Contacts permission denied</Text>
					<Text style={styles.deniedDescription}>
						Enable contacts permission in settings to invite people from your address book.
					</Text>
					<TouchableOpacity style={styles.permissionLink} onPress={() => Linking.openSettings()} activeOpacity={0.85}>
						<Text style={styles.permissionLinkText}>Open settings</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>Contacts</Text>
				<Text style={styles.subtitle}>{heroSubtitle}</Text>
			</View>
			<View style={styles.toolbar}>
				<View style={styles.searchBar}>
					<Ionicons name="search" size={16} color="#6b6f87" />
					<TextInput
						style={styles.searchInput}
						placeholder="Search contacts"
						placeholderTextColor="#6b6f87"
						value={searchQuery}
						onChangeText={setSearchQuery}
						autoCorrect={false}
					/>
					{searchQuery.length > 0 && (
						<TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
							<Ionicons name="close" size={16} color="#6b6f87" />
						</TouchableOpacity>
					)}
				</View>
				<TouchableOpacity style={styles.syncButton} onPress={onRefresh} disabled={refreshing} activeOpacity={0.85}>
					<Text style={styles.syncButtonText}>{refreshing ? 'Refreshing...' : 'Sync'}</Text>
				</TouchableOpacity>
				<TouchableOpacity style={styles.directoryButton} onPress={goToDirectory} activeOpacity={0.85}>
					<Text style={styles.directoryButtonText}>Directory</Text>
				</TouchableOpacity>
			</View>
			{isLoading ? (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color="#5560f6" />
					<Text style={styles.loadingText}>Loading contacts...</Text>
				</View>
			) : (
				<FlatList
					data={filteredContacts}
					renderItem={renderContact}
					keyExtractor={item => item.id}
					refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
					ListEmptyComponent={renderEmptyState}
					ItemSeparatorComponent={() => <View style={styles.separator} />}
					contentContainerStyle={filteredContacts.length === 0 ? styles.emptyPadding : undefined}
				/>
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#0c0c10',
		paddingHorizontal: 20,
		paddingTop: 20
	},
	header: {
		marginBottom: 16
	},
	title: {
		fontSize: 22,
		fontWeight: '700',
		color: '#f4f5f9',
		marginBottom: 8
	},
	subtitle: {
		fontSize: 14,
		color: '#9da3bd'
	},
	toolbar: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16
	},
	searchBar: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#161825',
		borderRadius: 16,
		paddingHorizontal: 14,
		paddingVertical: 10,
		marginRight: 12
	},
	searchInput: {
		flex: 1,
		fontSize: 14,
		color: '#f4f5f9',
		marginLeft: 8
	},
	syncButton: {
		paddingVertical: 10,
		paddingHorizontal: 16,
		borderRadius: 14,
		backgroundColor: '#1f2340',
		marginRight: 8
	},
	syncButtonText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#f4f5f9'
	},
	directoryButton: {
		paddingVertical: 10,
		paddingHorizontal: 16,
		borderRadius: 14,
		backgroundColor: '#5560f6'
	},
	directoryButtonText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#f4f5f9'
	},
	loadingContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 48
	},
	loadingText: {
		marginTop: 16,
		fontSize: 15,
		color: '#9da3bd'
	},
	emptyContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 48
	},
	emptyTitle: {
		marginTop: 20,
		marginBottom: 8,
		fontSize: 18,
		fontWeight: '600',
		color: '#f4f5f9'
	},
	emptyDescription: {
		fontSize: 14,
		color: '#9da3bd',
		textAlign: 'center',
		lineHeight: 22
	},
	emptyPadding: {
		flexGrow: 1,
		paddingVertical: 80
	},
	contactRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12
	},
	contactAvatar: {
		width: 52,
		height: 52,
		borderRadius: 26,
		backgroundColor: '#1f2340',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 16
	},
	contactImage: {
		width: 52,
		height: 52,
		borderRadius: 26
	},
	contactInitials: {
		fontSize: 18,
		fontWeight: '700',
		color: '#f4f5f9'
	},
	contactTextBlock: {
		flex: 1
	},
	contactName: {
		fontSize: 16,
		fontWeight: '600',
		color: '#f4f5f9',
		marginBottom: 4
	},
	contactNumber: {
		fontSize: 13,
		color: '#9da3bd'
	},
	separator: {
		height: 1,
		backgroundColor: '#1f2234'
	},
	permissionCard: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 32
	},
	permissionTitle: {
		marginTop: 16,
		marginBottom: 8,
		fontSize: 20,
		fontWeight: '600',
		color: '#f4f5f9'
	},
	permissionDescription: {
		fontSize: 14,
		color: '#9da3bd',
		textAlign: 'center',
		lineHeight: 22
	},
	permissionButton: {
		marginTop: 24,
		paddingVertical: 12,
		paddingHorizontal: 24,
		borderRadius: 14,
		backgroundColor: '#5560f6'
	},
	permissionButtonText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#f4f5f9'
	},
	permissionLink: {
		marginTop: 16
	},
	permissionLinkText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#8aa2ff'
	},
	deniedCard: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 32
	},
	deniedTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#f4f5f9',
		marginTop: 16,
		marginBottom: 8
	},
	deniedDescription: {
		fontSize: 14,
		color: '#9da3bd',
		textAlign: 'center',
		lineHeight: 22
	}
});
