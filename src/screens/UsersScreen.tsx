import React, {useContext, useEffect} from 'react';
import {Alert, StyleSheet, Text, View, FlatList} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {SafeAreaView} from 'react-native-safe-area-context';
import {StackNavigationProp} from '@react-navigation/stack';
import {WebRTCContext} from '../store/WebRTCContext';
import {User} from '../store/WebRTCTypes';
import {RootStackParamList} from '../types/navigation';
import {auth} from '../config/firebase';
import AnimatedHeader from '../components/AnimatedHeader';
import GradientCard from '../components/GradientCard';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

type UsersScreenNavigationProp = StackNavigationProp<RootStackParamList, 'UsersScreen'>;

interface Props {
  navigation: UsersScreenNavigationProp;
}

const UsersScreen = ({navigation}: Props) => {
  const {users, call, initialize, setUsername} = useContext(WebRTCContext);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser?.displayName) {
      setUsername(currentUser.displayName);
      initialize();
    }
  }, []);

  const onCall = (user: User) => {
    call(user);
    navigation.navigate('VideoCallScreen', {id: Date.now().toString()});
  };

  const renderUser = ({item, index}: {item: User; index: number}) => (
    <View>
      <TouchableOpacity onPress={() => onCall(item)} style={styles.userItem}>
        <LinearGradient
          colors={['#8b5cf6', '#ec4899']}
          style={styles.userGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.userInfo}>
            <LinearGradient
              colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.2)']}
              style={styles.userIcon}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="person" size={24} color="rgba(255,255,255,0.9)" />
            </LinearGradient>
            
            <View style={styles.userDetails}>
              <Text style={styles.username}>{item.username}</Text>
              <View style={styles.statusContainer}>
                <View style={[styles.statusDot, item.peerId ? styles.activeDot : styles.inactiveDot]} />
                <Text style={styles.status}>
                  {item.peerId ? 'Available' : 'Connecting...'}
                </Text>
              </View>
            </View>
            
            <Ionicons name="videocam" size={24} color="rgba(255,255,255,0.9)" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <AnimatedHeader
        title="Available Users"
        subtitle="Tap a user to start a video call"
        colors={['#11998e', '#38ef7d']}
      />
      
      <View style={styles.content}>
        {!users || users.length === 0 ? (
          <View style={styles.emptyState}>
            <GradientCard colors={['#ff9a9e', '#fecfef']} style={styles.emptyCard}>
              <Ionicons name="people-outline" size={48} color="#ffffff" />
              <Text style={styles.emptyText}>No other users online</Text>
              <Text style={styles.emptySubtext}>Ask someone to join the app</Text>
            </GradientCard>
          </View>
        ) : (
          <FlatList
            data={users}
            renderItem={renderUser}
            keyExtractor={(item) => item.username}
            style={styles.usersList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.usersListContent}
          />
        )}
      </View>
    </View>
  );
};

export default UsersScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  usersList: {
    flex: 1,
  },
  usersListContent: {
    paddingBottom: 20,
  },
  userItem: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  userGradient: {
    padding: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  activeDot: {
    backgroundColor: '#38ef7d',
  },
  inactiveDot: {
    backgroundColor: '#fecfef',
  },
  status: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
});