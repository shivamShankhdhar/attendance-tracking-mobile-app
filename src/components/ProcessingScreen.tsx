import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { BizoraMark } from './illustrations/BrandAssets';
import { HeaderBackgroundArt } from './illustrations/HeaderBackgroundArt';
import { LightPalette, DarkPalette } from '../constants/colors';
import { useTheme } from '../hooks/use-theme';

export interface ProcessingScreenProps {
  title?: string;
  subtitle?: string;
  badge?: string;
}

export function ProcessingScreen({
  title = 'Signing you in',
  subtitle = 'Checking your account…',
  badge = 'Secure sign-in',
}: ProcessingScreenProps) {
  const { isDark } = useTheme();

  // Animation drivers
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Breathing aura animation
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Continuous progress shimmer bar slide
    const slideLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();
    slideLoop.start();

    return () => {
      pulseLoop.stop();
      slideLoop.stop();
    };
  }, [pulseAnim, slideAnim]);

  const haloScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1.08],
  });

  const haloOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0.9],
  });

  const shimmerTranslate = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, 100],
  });

  const palette = isDark ? DarkPalette : LightPalette;

  return (
    <SafeAreaView
      style={[
        styles.screen,
        { backgroundColor: isDark ? DarkPalette.canvas : LightPalette.canvas },
      ]}
      edges={['top', 'bottom']}
    >
      <HeaderBackgroundArt offsetWithSafeArea={false} />

      <View
        accessible
        accessibilityRole="header"
        accessibilityState={{ busy: true }}
        accessibilityLabel={`${title}. ${subtitle}`}
        style={styles.centerContainer}
      >
        {/* Animated Brand Emblem & Aura */}
        <View style={styles.brandContainer}>
          <Animated.View
            style={[
              styles.haloRing,
              {
                backgroundColor: isDark ? 'rgba(149, 184, 54, 0.12)' : 'rgba(91, 105, 45, 0.08)',
                borderColor: isDark ? 'rgba(149, 184, 54, 0.22)' : 'rgba(91, 105, 45, 0.15)',
                transform: [{ scale: haloScale }],
                opacity: haloOpacity,
              },
            ]}
          />
          <View
            style={[
              styles.iconCard,
              {
                backgroundColor: isDark ? '#141710' : '#FFFFFF',
                borderColor: isDark ? 'rgba(149, 184, 54, 0.25)' : 'rgba(91, 105, 45, 0.14)',
                shadowColor: isDark ? '#000000' : '#2F3C18',
              },
            ]}
          >
            <BizoraMark size={52} />
          </View>
        </View>

        {/* Text Messaging */}
        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: palette.textPrimary }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{subtitle}</Text>
        </View>

        {/* Sleek Animated Shimmer Progress Bar */}
        <View
          style={[
            styles.progressTrack,
            { backgroundColor: isDark ? '#1E2419' : '#EAEFE2' },
          ]}
        >
          <Animated.View
            style={[
              styles.progressBar,
              {
                backgroundColor: palette.brandPrimary,
                transform: [{ translateX: shimmerTranslate }],
              },
            ]}
          />
        </View>
      </View>

      {/* Trust & Security Badge at Bottom */}
      <View style={styles.bottomArea}>
        <View
          style={[
            styles.badgePill,
            {
              backgroundColor: isDark ? 'rgba(23, 34, 14, 0.75)' : 'rgba(237, 243, 223, 0.75)',
              borderColor: isDark ? 'rgba(149, 184, 54, 0.25)' : 'rgba(91, 105, 45, 0.18)',
            },
          ]}
        >
          <Feather name="shield" size={13} color={palette.brandPrimary} />
          <Text style={[styles.badgeText, { color: palette.brandPrimary }]}>
            {badge || 'Protected · Bizora Security'}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingBottom: 24,
  },
  brandContainer: {
    width: 110,
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  haloRing: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 32,
    borderWidth: 1.5,
  },
  iconCard: {
    width: 82,
    height: 82,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  textBlock: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 28,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 280,
  },
  progressTrack: {
    width: 130,
    height: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBar: {
    width: 48,
    height: '100%',
    borderRadius: 999,
  },
  bottomArea: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 16,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

