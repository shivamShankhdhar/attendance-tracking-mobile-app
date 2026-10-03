import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Linking,
  Platform,
  Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Palette } from '../constants/colors';
import { BizoraMark } from './illustrations/BrandAssets';
import { APP_NAME, APP_TAGLINE, ABOUT_URL, PRIVACY_POLICY_URL } from '../constants/app';

import { useTheme } from '../hooks/use-theme';
import { AdBanner } from './AdBanner';

interface AboutModalProps {
  visible: boolean;
  onClose: () => void;
}

// Play Store Build & Signing Info
const ANDROID_PACKAGE = 'bizora.app';
const KEYSTORE_ALIAS = 'bizora-key';
const CERT_SHA256 = '13:0D:33:BF:C0:01:E6:49:F7:44:36:49:8C:83:A6:9F:85:F4:16:30:FB:7B:58:CA:F3:C2:6B:C6:C5:1B:D3:07';
const KEY_ALGORITHM = 'RSA-4096 / SHA384withRSA';
const KEY_VALID_UNTIL = '2054-02-15';

export function AboutModal({ visible, onClose }: AboutModalProps) {
  const version = Constants.expoConfig?.version || '1.0.0';
  const { palette } = useTheme();

  const [mounted, setMounted] = useState(visible);
  const slideAnim = useRef(new Animated.Value(500)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 28,
          mass: 0.8,
          stiffness: 240,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 500,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 500,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setMounted(false);
        onClose();
      }
    });
  };

  const handleOpenWebsite = () => {
    void Linking.openURL(ABOUT_URL);
  };

  const handleOpenPrivacy = () => {
    void Linking.openURL(PRIVACY_POLICY_URL);
  };

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        {/* Fast static overlay that does not slide */}
        <Animated.View style={[styles.backdrop, { opacity: overlayOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
        </Animated.View>

        {/* Modal sheet that slides from bottom to top */}
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: palette.border }]}>
            <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>About {APP_NAME}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close about modal"
              onPress={handleDismiss}
              hitSlop={10}
              style={[styles.closeBtn, { backgroundColor: palette.surfaceMuted, borderColor: palette.border }]}
            >
              <Feather name="x" size={20} color={palette.textPrimary} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Brand Hero */}
            <View style={styles.brandHero}>
              <View style={styles.markWrapper}>
                <BizoraMark size={52} />
              </View>
              <Text style={[styles.appName, { color: palette.textPrimary }]}>{APP_NAME}</Text>
              <Text style={[styles.appTagline, { color: palette.textSecondary }]}>{APP_TAGLINE}</Text>
              <View style={[styles.versionBadge, { backgroundColor: palette.surfaceMuted, borderColor: palette.border }]}>
                <Text style={[styles.versionText, { color: palette.textSecondary }]}>Version {version} • Production</Text>
              </View>
            </View>

            {/* Description */}
            <View style={[styles.infoCard, { backgroundColor: palette.canvas, borderColor: palette.border }]}>
              <Text style={[styles.infoText, { color: palette.textPrimary }]}>
                {APP_NAME} is an all-in-one workforce attendance platform engineered for precision, privacy, and speed. It enables employees and employers to track shifts effortlessly with fraud-proof QR codes, biometric authentication, and instant exports.
              </Text>
            </View>

            {/* Feature Highlights */}
            <View style={styles.section}>
              <Text style={[styles.sectionHeading, { color: palette.textSecondary }]}>KEY CAPABILITIES</Text>
              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <View style={[styles.featureIcon, { backgroundColor: palette.brandTint, borderColor: palette.border }]}>
                    <Feather name="maximize" size={16} color={palette.brandPrimary} />
                  </View>
                  <View style={styles.featureTextWrapper}>
                    <Text style={[styles.featureTitle, { color: palette.textPrimary }]}>Smart QR Clock-In</Text>
                    <Text style={[styles.featureDesc, { color: palette.textSecondary }]}>
                      Dynamic QR code scanning for fast, contactless check-ins and check-outs.
                    </Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <View style={[styles.featureIcon, { backgroundColor: palette.brandTint, borderColor: palette.border }]}>
                    <Feather name="shield" size={16} color={palette.brandPrimary} />
                  </View>
                  <View style={styles.featureTextWrapper}>
                    <Text style={[styles.featureTitle, { color: palette.textPrimary }]}>Bank-Grade Security</Text>
                    <Text style={[styles.featureDesc, { color: palette.textSecondary }]}>
                      MPIN protection, biometric locks (Face ID &amp; Fingerprint), and secure credential protection.
                    </Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <View style={[styles.featureIcon, { backgroundColor: palette.brandTint, borderColor: palette.border }]}>
                    <Feather name="file-text" size={16} color={palette.brandPrimary} />
                  </View>
                  <View style={styles.featureTextWrapper}>
                    <Text style={[styles.featureTitle, { color: palette.textPrimary }]}>Live Reports &amp; Exports</Text>
                    <Text style={[styles.featureDesc, { color: palette.textSecondary }]}>
                      Instant PDF and CSV/Excel exports for payroll and shift audits.
                    </Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <View style={[styles.featureIcon, { backgroundColor: palette.brandTint, borderColor: palette.border }]}>
                    <Feather name="layers" size={16} color={palette.brandPrimary} />
                  </View>
                  <View style={styles.featureTextWrapper}>
                    <Text style={[styles.featureTitle, { color: palette.textPrimary }]}>Multi-Workplace &amp; Offline</Text>
                    <Text style={[styles.featureDesc, { color: palette.textSecondary }]}>
                      Switch between workplaces instantly and log attendance even when offline.
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* External Web Links */}
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Visit official website"
                style={[styles.primaryBtn, { backgroundColor: palette.brandPrimary }]}
                onPress={handleOpenWebsite}
              >
                <Feather name="globe" size={16} color={palette.textInverse} />
                <Text style={[styles.primaryBtnText, { color: palette.textInverse }]}>Visit Official Website</Text>
                <Feather name="external-link" size={14} color={palette.textInverse} style={{ opacity: 0.8 }} />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Read privacy policy"
                style={[styles.secondaryBtn, { backgroundColor: palette.brandTint, borderColor: palette.border }]}
                onPress={handleOpenPrivacy}
              >
                <Feather name="shield" size={16} color={palette.brandPrimary} />
                <Text style={[styles.secondaryBtnText, { color: palette.brandPrimary }]}>Privacy Policy &amp; AdMob</Text>
                <Feather name="external-link" size={14} color={palette.brandPrimary} />
              </Pressable>
            </View>

            {/* Build & Distribution Info — Android only */}
            {Platform.OS === 'android' && (
              <View style={styles.section}>
                <Text style={[styles.sectionHeading, { color: palette.textSecondary }]}>BUILD & DISTRIBUTION</Text>
                <View style={[styles.buildInfoCard, { backgroundColor: palette.surfaceMuted, borderColor: palette.border }]}>
                  <View style={styles.buildRow}>
                    <View style={[styles.buildIcon, { backgroundColor: palette.brandTint }]}>
                      <Feather name="package" size={13} color={palette.brandPrimary} />
                    </View>
                    <View style={styles.buildText}>
                      <Text style={[styles.buildLabel, { color: palette.textSecondary }]}>Android Package</Text>
                      <Text style={[styles.buildValue, { color: palette.textPrimary }]}>{ANDROID_PACKAGE}</Text>
                    </View>
                  </View>
                  <View style={[styles.buildDivider, { backgroundColor: palette.border }]} />
                  <View style={styles.buildRow}>
                    <View style={[styles.buildIcon, { backgroundColor: palette.brandTint }]}>
                      <Feather name="key" size={13} color={palette.brandPrimary} />
                    </View>
                    <View style={styles.buildText}>
                      <Text style={[styles.buildLabel, { color: palette.textSecondary }]}>Keystore Alias</Text>
                      <Text style={[styles.buildValue, { color: palette.textPrimary }]}>{KEYSTORE_ALIAS}</Text>
                    </View>
                  </View>
                  <View style={[styles.buildDivider, { backgroundColor: palette.border }]} />
                  <View style={styles.buildRow}>
                    <View style={[styles.buildIcon, { backgroundColor: palette.brandTint }]}>
                      <Feather name="cpu" size={13} color={palette.brandPrimary} />
                    </View>
                    <View style={styles.buildText}>
                      <Text style={[styles.buildLabel, { color: palette.textSecondary }]}>Key Algorithm</Text>
                      <Text style={[styles.buildValue, { color: palette.textPrimary }]}>{KEY_ALGORITHM}</Text>
                    </View>
                  </View>
                  <View style={[styles.buildDivider, { backgroundColor: palette.border }]} />
                  <View style={styles.buildRow}>
                    <View style={[styles.buildIcon, { backgroundColor: palette.brandTint }]}>
                      <Feather name="calendar" size={13} color={palette.brandPrimary} />
                    </View>
                    <View style={styles.buildText}>
                      <Text style={[styles.buildLabel, { color: palette.textSecondary }]}>Certificate Valid Until</Text>
                      <Text style={[styles.buildValue, { color: palette.textPrimary }]}>{KEY_VALID_UNTIL}</Text>
                    </View>
                  </View>
                  <View style={[styles.buildDivider, { backgroundColor: palette.border }]} />
                  <View style={styles.buildRow}>
                    <View style={[styles.buildIcon, { backgroundColor: palette.brandTint }]}>
                      <Feather name="shield" size={13} color={palette.brandPrimary} />
                    </View>
                    <View style={styles.buildText}>
                      <Text style={[styles.buildLabel, { color: palette.textSecondary }]}>SHA-256 Fingerprint</Text>
                      <Text style={[styles.buildValueMono, { color: palette.textSecondary }]} numberOfLines={2}>{CERT_SHA256}</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Copyright */}
            <Text style={[styles.copyright, { color: palette.textSecondary }]}>
              © 2026 {APP_NAME} OS • All rights reserved.
            </Text>
          </ScrollView>
          <AdBanner position="bottom" safeBottom />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(27, 34, 16, 0.55)',
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Palette.border,
    shadowColor: '#1B2210',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 0,
    backgroundColor: Palette.canvas,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  content: {
    padding: 22,
    gap: 18,
  },
  brandHero: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  markWrapper: {
    padding: 6,
  },
  appName: {
    fontSize: 24,
    fontWeight: '800',
    color: Palette.textPrimary,
    letterSpacing: -0.5,
  },
  appTagline: {
    fontSize: 13,
    color: Palette.textSecondary,
    textAlign: 'center',
  },
  versionBadge: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: Palette.surfaceMuted,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  versionText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  infoCard: {
    backgroundColor: Palette.canvas,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  infoText: {
    fontSize: 13,
    color: Palette.textPrimary,
    lineHeight: 19,
  },
  section: {
    gap: 10,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: Palette.textSecondary,
  },
  featureList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Palette.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  featureTextWrapper: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  featureDesc: {
    fontSize: 12,
    color: Palette.textSecondary,
    lineHeight: 17,
  },
  actions: {
    gap: 10,
    marginTop: 6,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.brandPrimary,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: Palette.brandPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.brandTint,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Palette.border,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.brandPrimary,
  },
  copyright: {
    textAlign: 'center',
    fontSize: 11,
    color: Palette.textSecondary,
    marginTop: 6,
  },
  buildInfoCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  buildRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  buildIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buildText: {
    flex: 1,
    gap: 1,
  },
  buildLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  buildValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  buildValueMono: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 14,
  },
  buildDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 54,
  },
});
