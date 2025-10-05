import React from 'react';
import { View, Text, Image, FlatList, Pressable, type ListRenderItem } from 'react-native';
import Animated, { type AnimatedStyleProp } from 'react-native-reanimated';
import { homeStyles } from '../styles';
import type { CallRow, CallProfile } from '../types';

interface CallRowSectionProps extends CallRow {
  onSelect: (id: string) => void;
  animationStyle?: AnimatedStyleProp<any>;
}

function CallThumbnail({ avatar, status }: { avatar: string; status: string }) {
  return (
    <View style={homeStyles.contentThumbnail}>
      <Image source={{ uri: avatar }} style={homeStyles.contentImage} />
      {status === 'Live' && (
        <View style={homeStyles.liveBadge}>
          <Text style={homeStyles.liveBadgeText}>Live</Text>
        </View>
      )}
    </View>
  );
}

export function CallRowSection({ rowTitle, profiles, onSelect, animationStyle }: CallRowSectionProps) {
  const renderItem: ListRenderItem<CallProfile> = ({ item }) => (
    <Animated.View style={animationStyle}>
      <Pressable style={homeStyles.contentItem} onPress={() => onSelect(item.id)}>
        <CallThumbnail avatar={item.avatar} status={item.status} />
        <Text style={homeStyles.contentName}>{item.name}</Text>
        <Text style={homeStyles.contentStatus}>{item.status}</Text>
        <Text style={homeStyles.contentMeta}>{item.languages.join(' • ')}</Text>
        <Text style={homeStyles.contentMeta}>{item.lastInteraction}</Text>
      </Pressable>
    </Animated.View>
  );

  return (
    <View style={homeStyles.sectionContainer}>
      <Text style={homeStyles.sectionTitle}>{rowTitle}</Text>
      <FlatList
        data={profiles}
        horizontal
        keyExtractor={item => item.id}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={homeStyles.contentList}
      />
    </View>
  );
}
