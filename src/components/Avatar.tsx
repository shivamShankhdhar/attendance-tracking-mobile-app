import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Palette } from '../constants/colors';


interface AvatarProps {
  name?: string;
  avatarUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBorder?: boolean;
  badgeBg?: string;
  badgeTextColor?: string;
}

export function Avatar({
  name = 'User',
  avatarUrl,
  size = 'md',
  showBorder = false,
  badgeBg,
  badgeTextColor,
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);

  const getInitials = (str: string) => {
    if (!str) return 'U';
    const parts = str.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const dimensions = {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
  }[size];

  const fontSizes = {
    sm: 12,
    md: 14,
    lg: 18,
    xl: 24,
  }[size];

  const effectiveUrl =
    avatarUrl && avatarUrl.trim() !== ''
      ? avatarUrl
      : `https://api.dicebear.com/7.x/personas/png?seed=${encodeURIComponent(name || 'User')}&backgroundColor=e5ebd8,f5f6e8,d4dec2`;

  const hasRemoteUrl = effectiveUrl && effectiveUrl.trim() !== '' && !imageError;

  return (
    <View
      style={[
        styles.container,
        {
          width: dimensions,
          height: dimensions,
          borderRadius: dimensions / 2,
        },
        showBorder && styles.bordered,
      ]}
    >
      {hasRemoteUrl ? (
        <Image
          source={{ uri: effectiveUrl }}
          style={{ width: dimensions, height: dimensions, borderRadius: dimensions / 2 }}
          onError={() => setImageError(true)}
        />
      ) : (
        <View
          style={[
            styles.fallbackContainer,
            {
              width: dimensions,
              height: dimensions,
              borderRadius: dimensions / 2,
              backgroundColor: badgeBg || Palette.brandTint,
            },
          ]}
        >
          <Text
            style={[
              styles.initialsText,
              { fontSize: fontSizes, color: badgeTextColor || Palette.brandPressed },
            ]}
          >
            {getInitials(name)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bordered: {
    borderWidth: 2,
    borderColor: Palette.surface,
  },
  fallbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontWeight: '700',
  },
});
