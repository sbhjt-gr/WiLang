import React from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { type AnimatedStyleProp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { homeStyles } from '../styles';
import type { FeaturedCall as FeaturedCallData } from '../types';

interface FeaturedCallProps {
  call: FeaturedCallData;
  imageStyle: AnimatedStyleProp<any>;
  contentStyle: AnimatedStyleProp<any>;
  buttonsStyle: AnimatedStyleProp<any>;
  topMargin: number;
  onStartCall: () => void;
  onPreview: () => void;
}

export function FeaturedCall({ call, imageStyle, contentStyle, buttonsStyle, topMargin, onStartCall, onPreview }: FeaturedCallProps) {
  return (
    <View style={[homeStyles.featuredContent, { marginTop: topMargin }]}> 
      <View style={homeStyles.featuredWrapper}>
        <Animated.Image source={{ uri: call.backgroundImage }} style={[homeStyles.featuredImage, imageStyle]} />
        <LinearGradient colors={['transparent', 'rgba(5,6,10,0.92)']} style={homeStyles.featuredGradient} />
        <View style={homeStyles.featuredOverlay}>
          <Animated.View style={[homeStyles.featuredLanguages, contentStyle]}>
            <Text style={homeStyles.featuredTitle}>{call.title}</Text>
            <Text style={homeStyles.featuredSubtitle}>{call.subtitle}</Text>
            <Text style={homeStyles.languagesText}>{call.languages.join(' • ')}</Text>
          </Animated.View>
          <Animated.View style={[homeStyles.featuredParticipants, buttonsStyle]}>
            {call.participants.map(profile => (
              <View key={profile.id} style={homeStyles.avatarRing}>
                <Image source={{ uri: profile.avatar }} style={homeStyles.avatarImage} />
              </View>
            ))}
          </Animated.View>
          <Animated.View style={[homeStyles.featuredButtons, buttonsStyle]}>
            <Pressable style={[homeStyles.featuredButton, homeStyles.featuredButtonPrimary]} onPress={onStartCall}>
              <Ionicons name="videocam" size={20} color="#05060a" />
              <Text style={homeStyles.featuredButtonTextPrimary}>Join Live</Text>
            </Pressable>
            <Pressable style={[homeStyles.featuredButton, homeStyles.featuredButtonSecondary]} onPress={onPreview}>
              <Ionicons name="information-circle" size={20} color="#fff" />
              <Text style={homeStyles.featuredButtonTextSecondary}>Room Info</Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}
