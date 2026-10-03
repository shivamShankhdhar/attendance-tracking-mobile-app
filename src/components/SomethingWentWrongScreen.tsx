import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Palette } from '../constants/colors';
import { ErrorCloudIllustration } from './illustrations/IllustrationAssets';

interface SomethingWentWrongScreenProps {
  title?: string;
  subtitle?: string;
  onRetry: () => void;
  onBack?: () => void;
}

export function SomethingWentWrongScreen({
  title = 'Something went wrong',
  subtitle = 'Your information is safe.\nTry again in a moment.',
  onRetry,
  onBack,
}: SomethingWentWrongScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={onBack}
            style={styles.backBtn}
          >
            <Feather name="arrow-left" size={22} color={Palette.textPrimary} />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
        <Text style={styles.appNameHeader}>Bizora</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Cloud with Exclamation Illustration */}
        <View style={styles.illustrationWrap}>
          <ErrorCloudIllustration size={130} />
        </View>

        {/* Heading */}
        <Text style={styles.titleText}>{title}</Text>
        <Text style={styles.subtitleText}>{subtitle}</Text>

        {/* Retry Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry"
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retryBtn,
            pressed && styles.retryBtnPressed,
          ]}
        >
          <Feather name="refresh-cw" size={17} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.retryBtnText}>Retry</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  topHeader: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 0,
    backgroundColor: Palette.canvas,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  appNameHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.brandPrimary,
    letterSpacing: -0.3,
  },
  contentContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  illustrationWrap: {
    marginVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 24,
    fontWeight: '800',
    color: Palette.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  subtitleText: {
    fontSize: 15,
    color: Palette.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.brandPrimary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 320,
    shadowColor: Palette.brandPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  retryBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
