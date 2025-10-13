import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { User } from '../store/WebRTCTypes';

const { width, height } = Dimensions.get('window');

interface AnimatedParticipant extends User {
  animatedScale: Animated.Value;
  animatedOpacity: Animated.Value;
  animatedTranslateY: Animated.Value;
}

interface ParticipantGridProps {
  participants: User[];
  localStream: any;
  remoteStreams?: Map<string, any>;
  currentUser: string;
  onRefreshParticipant?: (participantPeerId: string) => void;
}

const ParticipantGrid: React.FC<ParticipantGridProps> = ({
  participants,
  localStream,
  remoteStreams = new Map(),
  currentUser,
  onRefreshParticipant,
}) => {
  const [animatedParticipants, setAnimatedParticipants] = useState<Map<string, AnimatedParticipant>>(new Map());

  const createAnimatedParticipant = useCallback((participant: User): AnimatedParticipant => {
    return {
      ...participant,
      animatedScale: new Animated.Value(0),
      animatedOpacity: new Animated.Value(0),
      animatedTranslateY: new Animated.Value(50),
    };
  }, []);

  const animateParticipantEntry = useCallback((animatedParticipant: AnimatedParticipant) => {
    Animated.parallel([
      Animated.spring(animatedParticipant.animatedScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(animatedParticipant.animatedOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(animatedParticipant.animatedTranslateY, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const animateParticipantExit = useCallback((animatedParticipant: AnimatedParticipant) => {
    Animated.parallel([
      Animated.spring(animatedParticipant.animatedScale, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(animatedParticipant.animatedOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(animatedParticipant.animatedTranslateY, {
        toValue: -50,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    setAnimatedParticipants(prevAnimatedParticipants => {
      const newAnimatedParticipants = new Map(prevAnimatedParticipants);
      let hasChanges = false;
      
      participants.forEach(participant => {
        if (!newAnimatedParticipants.has(participant.id)) {
          const animatedParticipant = createAnimatedParticipant(participant);
          newAnimatedParticipants.set(participant.id, animatedParticipant);
          animateParticipantEntry(animatedParticipant);
          hasChanges = true;
        }
      });

      Array.from(prevAnimatedParticipants.keys()).forEach(participantId => {
        if (!participants.find(p => p.id === participantId)) {
          const animatedParticipant = prevAnimatedParticipants.get(participantId);
          if (animatedParticipant) {
            animateParticipantExit(animatedParticipant);
            setTimeout(() => {
              setAnimatedParticipants(current => {
                const updated = new Map(current);
                updated.delete(participantId);
                return updated;
              });
            }, 400);
          }
          newAnimatedParticipants.delete(participantId);
          hasChanges = true;
        }
      });

      return hasChanges ? newAnimatedParticipants : prevAnimatedParticipants;
    });
  }, [participants, createAnimatedParticipant, animateParticipantEntry, animateParticipantExit]);

  const getOptimalLayout = (count: number) => {
    if (count <= 2) return { rows: 2, cols: 1 };
    if (count <= 4) return { rows: 2, cols: 2 };
    if (count <= 6) return { rows: 2, cols: 3 };
    if (count <= 9) return { rows: 3, cols: 3 };
    return { rows: 4, cols: 3 };
  };

  const localParticipant: User = {
    id: `local-grid-${currentUser}`,
    username: currentUser,
    name: currentUser,
    peerId: `local-grid-${currentUser}`,
    isLocal: true,
  };

  const remoteParticipants = participants.filter(p => !p.isLocal && p.peerId !== currentUser);

  const allParticipants = [localParticipant, ...remoteParticipants];
  const totalParticipants = allParticipants.length;
  
  const { rows, cols } = getOptimalLayout(totalParticipants);
  const participantWidth = (width - 30) / cols;
  const participantHeight = (height * 0.75) / rows;

  const renderParticipantView = (participant: User, index: number) => {
    const isLocal = participant.isLocal;
    const animatedParticipant = animatedParticipants.get(participant.id);
    const hasStream = isLocal ? !!localStream : !!remoteStreams?.get(participant.peerId);
    const stream = isLocal ? localStream : remoteStreams?.get(participant.peerId);

    return (
      <Animated.View
        key={participant.id}
        style={[
          styles.participantContainer,
          {
            width: participantWidth,
            height: participantHeight,
            opacity: animatedParticipant?.animatedOpacity || 1,
            transform: [
              { scale: animatedParticipant?.animatedScale || 1 },
              { translateY: animatedParticipant?.animatedTranslateY || 0 },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={
            isLocal
              ? ['rgba(139, 92, 246, 0.3)', 'rgba(236, 72, 153, 0.3)']
              : ['rgba(0, 0, 0, 0.2)', 'rgba(0, 0, 0, 0.1)']
          }
          style={styles.participantGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {hasStream && stream ? (
            <RTCView
              style={styles.videoStream}
              streamURL={stream.toURL()}
              objectFit="cover"
              mirror={isLocal}
              zOrder={isLocal ? 1 : 0}
            />
          ) : (
            <View style={styles.noVideoContainer}>
              <LinearGradient
                colors={
                  isLocal
                    ? ['#8b5cf6', '#ec4899']
                    : ['#6366f1', '#8b5cf6']
                }
                style={styles.avatarGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.avatarContainer}>
                  <Ionicons 
                    name={hasStream ? "videocam-off" : "person"} 
                    size={participantWidth > 100 ? 32 : 24} 
                    color="#ffffff" 
                  />
                </View>
              </LinearGradient>
              <Text style={styles.noVideoText}>
                {hasStream ? "Camera off" : "Connecting..."}
              </Text>
            </View>
          )}
          
          <View style={styles.participantInfo}>
            <LinearGradient
              colors={['rgba(0, 0, 0, 0.8)', 'rgba(0, 0, 0, 0.4)']}
              style={styles.nameContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            >
              <View style={styles.nameRow}>
                <Text style={styles.participantName} numberOfLines={1}>
                  {isLocal ? 'You' : participant.name || participant.username}
                </Text>
                {!isLocal && onRefreshParticipant && (
                  <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={() => onRefreshParticipant(participant.peerId)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="refresh" size={14} color="#ffffff" />
                  </TouchableOpacity>
                )}
              </View>
              {!isLocal && (
                <View style={styles.statusIndicator}>
                  <View style={[
                    styles.connectionDot,
                    { backgroundColor: hasStream ? '#10b981' : '#ef4444' }
                  ]} />
                  <Text style={styles.statusText}>
                    {hasStream ? 'Connected' : 'Connecting'}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  const renderGrid = () => {
    const participantsToRender = [...allParticipants];

    return (
      <View style={styles.gridContainer}>
        <View style={[styles.grid, { flexDirection: 'column' }]}>
          {Array.from({ length: rows }, (_, rowIndex) => (
            <View key={`row-${rowIndex}`} style={styles.gridRow}>
              {Array.from({ length: cols }, (_, colIndex) => {
                const participantIndex = rowIndex * cols + colIndex;
                const participant = participantsToRender[participantIndex];
                
                if (participantIndex >= participantsToRender.length) {
                  return (
                    <View
                      key={`empty-${participantIndex}`}
                      style={{
                        width: participantWidth,
                        height: participantHeight,
                        margin: 5,
                      }}
                    />
                  );
                }
                
                return renderParticipantView(participant, participantIndex);
              })}
            </View>
          ))}
        </View>
      </View>
    );
  };

  return renderGrid();
};

const styles = StyleSheet.create({
  gridContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 20,
  },
  grid: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 5,
  },
  participantContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    margin: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  participantGradient: {
    flex: 1,
    padding: 2,
  },
  videoStream: {
    flex: 1,
    borderRadius: 14,
  },
  noVideoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    overflow: 'hidden',
  },
  avatarGradient: {
    width: '100%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noVideoText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  participantInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  nameContainer: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  participantName: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  refreshButton: {
    marginLeft: 6,
    padding: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  connectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontWeight: '500',
  },
});

export default ParticipantGrid;
