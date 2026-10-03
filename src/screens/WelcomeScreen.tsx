import React from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect, Path, Circle } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';

interface WelcomeScreenProps {
  onGetStarted: () => void;
  onNavigateToReviewer?: () => void;
}

// Design system colors
const THEME = {
  canvas: '#F8FAEF',
  iconBg: '#EDF3E1',
  iconColor: '#4A5832',
  tagBg: '#EDF1DE',
  tagBorder: '#D8DEC8',
  tagText: '#55643B',
  titleDark: '#12160E',
  titleGreen: '#505E35',
  subtitle: '#636C56',
  itemTitle: '#151910',
  itemDesc: '#636B57',
  divider: '#EBEFE2',
  buttonBg: '#596437',
  buttonPressed: '#48522A',
  buttonText: '#FFFFFF',
};

function TopAttendanceMark({ size = 42 }: { size?: number }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 46 46" fill="none">
        <Rect x="5" y="5" width="36" height="36" rx="12" fill={THEME.iconBg} />
        <Path d="M 12 20 V 15 C 12 13.3 13.3 12 15 12 H 20" stroke={THEME.iconColor} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M 26 12 H 31 C 32.7 12 34 13.3 34 15 V 20" stroke={THEME.iconColor} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M 12 26 V 31 C 12 32.7 13.3 34 15 34 H 20" stroke={THEME.iconColor} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M 26 34 H 31 C 32.7 34 34 32.7 34 31 V 26" stroke={THEME.iconColor} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        <Rect x="17.5" y="17.5" width="4.5" height="4.5" rx="1" stroke={THEME.iconColor} strokeWidth="1.8" fill="none" />
        <Rect x="24" y="17.5" width="4.5" height="4.5" rx="1" stroke={THEME.iconColor} strokeWidth="1.8" fill="none" />
        <Rect x="17.5" y="24" width="4.5" height="4.5" rx="1" stroke={THEME.iconColor} strokeWidth="1.8" fill="none" />
        <Rect x="24" y="24" width="2.2" height="2.2" rx="0.5" fill={THEME.iconColor} />
        <Rect x="26.8" y="26.8" width="1.7" height="1.7" rx="0.4" fill={THEME.iconColor} />
      </Svg>
    </View>
  );
}

function FeatureIconScan({ size = 22, color = THEME.iconColor }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M2.5 7.5V5C2.5 3.6 3.6 2.5 5 2.5H7.5" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16.5 2.5H19C20.4 2.5 21.5 3.6 21.5 5V7.5" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M2.5 16.5V19C2.5 20.4 3.6 21.5 5 21.5H7.5" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16.5 21.5H19C20.4 21.5 21.5 20.4 21.5 19V16.5" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M7 8H10" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M13.5 8H17" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M7 12H17" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <Path d="M7 16H11.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function FeatureIconTeam({ size = 24, color = THEME.iconColor }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Circle cx="14" cy="9.5" r="3.4" stroke={color} strokeWidth="2.2" fill="none" />
      <Path d="M7.5 22.5C7.5 18.5 10.4 15.5 14 15.5C17.6 15.5 20.5 18.5 20.5 22.5" stroke={color} strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <Path d="M6 10.8C5.2 11.5 4.8 12.6 4.8 13.8C4.8 15 5.5 16 6.5 16.5" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
      <Path d="M3 22C3 19.5 4.5 17.5 6.5 16.8" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
      <Path d="M22 10.8C22.8 11.5 23.2 12.6 23.2 13.8C23.2 15 22.5 16 21.5 16.5" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
      <Path d="M25 22C25 19.5 23.5 17.5 21.5 16.8" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function FeatureIconShieldLock({ size = 22, color = THEME.iconColor }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2.5C12 2.5 15.5 4.5 19.5 5.2V11.5C19.5 16.2 16.2 20.3 12 21.5C7.8 20.3 4.5 16.2 4.5 11.5V5.2C8.5 4.5 12 2.5 12 2.5Z" stroke={color} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Rect x="9.5" y="11" width="5" height="4.5" rx="1.2" fill={color} />
      <Path d="M10.4 11V9.4C10.4 8.5 11.1 7.8 12 7.8C12.9 7.8 13.6 8.5 13.6 9.4V11" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

// Clamp a value between min and max
function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function WelcomeScreen({ onGetStarted, onNavigateToReviewer }: WelcomeScreenProps) {
  const { width, height } = useWindowDimensions();

  // Scale factor: 1.0 on a 812px tall device (iPhone X), shrinks on smaller screens
  const scale = clamp(height / 812, 0.72, 1.15);
  const isWide = width > 500;

  // All dynamic values derived from scale so nothing overflows
  const iconSize = Math.round(42 * scale);
  const tagFontSize = clamp(11 * scale, 9, 12);
  const headlineFontSize = clamp(28 * scale, 22, 34);
  const headlineLineHeight = headlineFontSize * 1.18;
  const subtitleFontSize = clamp(14.5 * scale, 12, 16);
  const subtitleLineHeight = subtitleFontSize * 1.45;
  const illustrationHeight = clamp(height * 0.22, 100, 200);
  const featureIconBoxSize = clamp(46 * scale, 38, 54);
  const featureIconSize = Math.round(featureIconBoxSize * 0.48);
  const featureTitleSize = clamp(14.5 * scale, 12.5, 16.5);
  const featureDescSize = clamp(12.5 * scale, 11, 14);
  const featureDescLineHeight = featureDescSize * 1.38;
  const featureVertPad = clamp(6 * scale, 4, 10);
  const buttonHeight = clamp(52 * scale, 44, 58);
  const buttonFontSize = clamp(16 * scale, 14, 19);
  const buttonRadius = clamp(16 * scale, 12, 20);

  // Vertical spacing between sections
  const gapTop = clamp(height * 0.012, 4, 14);
  const gapBadge = clamp(height * 0.014, 6, 18);
  const gapHeadline = clamp(height * 0.01, 4, 14);
  const gapSubtitle = clamp(height * 0.012, 4, 16);
  const gapIllustration = clamp(height * 0.012, 4, 16);
  const gapFeatures = clamp(height * 0.018, 8, 24);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.canvas} />

      {/* Decorative background accents */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={styles.bgCapsule} />
        <View style={styles.bgBlob} />
      </View>

      {/* Root: full height, no scroll */}
      <View style={[styles.root, { paddingHorizontal: isWide ? 32 : 22 }]}>
        <View style={[styles.content, { maxWidth: isWide ? 420 : undefined }]}>

          {/* 1. Top Logo Mark */}
          <View style={{ alignItems: 'center', marginBottom: gapTop }}>
            <TopAttendanceMark size={iconSize} />
          </View>

          {/* 2. Badge Pill */}
          <View style={[styles.tagBadge, { marginBottom: gapBadge }]}>
            <Text style={[styles.tagBadgeText, { fontSize: tagFontSize }]}>WORKPLACE ATTENDANCE</Text>
          </View>

          {/* 3. Main Headline */}
          <View style={[styles.headlineWrap, { marginBottom: gapHeadline }]}>
            <Text accessibilityRole="header" style={[styles.headlineDark, { fontSize: headlineFontSize, lineHeight: headlineLineHeight }]}>
              Clock in with a scan.
            </Text>
            <Text accessibilityRole="header" style={[styles.headlineGreen, { fontSize: headlineFontSize, lineHeight: headlineLineHeight }]}>
              Carry on with your day.
            </Text>
          </View>

          {/* 4. Subtitle */}
          <View style={[styles.subtitleWrap, { marginBottom: gapSubtitle }]}>
            <Text style={[styles.subtitleText, { fontSize: subtitleFontSize, lineHeight: subtitleLineHeight }]}>Simple check-ins. Clear approvals.</Text>
            <Text style={[styles.subtitleText, { fontSize: subtitleFontSize, lineHeight: subtitleLineHeight }]}>A team that stays in sync.</Text>
          </View>

          {/* 5. Illustration — height-capped, never overflows */}
          <View style={[styles.illustrationWrap, { height: illustrationHeight, marginBottom: gapIllustration, marginHorizontal: isWide ? 0 : -22 }]}>
            <Image
              source={require('../../assets/images/welcome-illustration.png')}
              style={styles.illustration}
              resizeMode="contain"
              accessible={false}
            />
          </View>

          {/* 6. Feature List */}
          <View style={[styles.featuresSection, { marginBottom: gapFeatures }]}>
            {/* Feature 1 */}
            <View style={[styles.featureItem, { paddingVertical: featureVertPad }]}>
              <View style={[styles.featureIconBox, { width: featureIconBoxSize, height: featureIconBoxSize, borderRadius: featureIconBoxSize * 0.32 }]}>
                <FeatureIconScan size={featureIconSize} />
              </View>
              <View style={styles.featureCopy}>
                <Text style={[styles.featureTitle, { fontSize: featureTitleSize }]}>QR check-in requests</Text>
                <Text style={[styles.featureDesc, { fontSize: featureDescSize, lineHeight: featureDescLineHeight }]}>
                  Scan workplace codes to send your attendance request.
                </Text>
              </View>
            </View>

            <View style={styles.featureDivider} />

            {/* Feature 2 */}
            <View style={[styles.featureItem, { paddingVertical: featureVertPad }]}>
              <View style={[styles.featureIconBox, { width: featureIconBoxSize, height: featureIconBoxSize, borderRadius: featureIconBoxSize * 0.32 }]}>
                <FeatureIconTeam size={featureIconSize} />
              </View>
              <View style={styles.featureCopy}>
                <Text style={[styles.featureTitle, { fontSize: featureTitleSize }]}>Live approval updates</Text>
                <Text style={[styles.featureDesc, { fontSize: featureDescSize, lineHeight: featureDescLineHeight }]}>
                  See real-time status from your team or manager.
                </Text>
              </View>
            </View>

            <View style={styles.featureDivider} />

            {/* Feature 3 */}
            <View style={[styles.featureItem, { paddingVertical: featureVertPad }]}>
              <View style={[styles.featureIconBox, { width: featureIconBoxSize, height: featureIconBoxSize, borderRadius: featureIconBoxSize * 0.32 }]}>
                <FeatureIconShieldLock size={featureIconSize} />
              </View>
              <View style={styles.featureCopy}>
                <Text style={[styles.featureTitle, { fontSize: featureTitleSize }]}>PIN & biometric app lock</Text>
                <Text style={[styles.featureDesc, { fontSize: featureDescSize, lineHeight: featureDescLineHeight }]}>
                  Keep your app private with PIN, Face ID or fingerprint.
                </Text>
              </View>
            </View>
          </View>

          {/* 7. CTA Button — pinned to bottom of content */}
          <View style={styles.actionWrap}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Get started"
              onPress={onGetStarted}
              style={({ pressed }) => [
                styles.button,
                { height: buttonHeight, borderRadius: buttonRadius },
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={[styles.buttonText, { fontSize: buttonFontSize }]}>Get started</Text>
              <Feather name="arrow-right" size={buttonFontSize + 2} color={THEME.buttonText} />
            </Pressable>

            {onNavigateToReviewer && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Reviewer Login"
                onPress={onNavigateToReviewer}
                style={({ pressed }) => [styles.reviewerBtn, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.reviewerBtnText}>Reviewer Login</Text>
              </Pressable>
            )}
          </View>

        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.canvas,
  },

  // Root replaces ScrollView — fills the entire safe area, never scrolls
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Background accents
  bgCapsule: {
    position: 'absolute',
    top: -30,
    right: 36,
    width: 82,
    height: 180,
    borderRadius: 41,
    backgroundColor: '#EDF3E0',
    opacity: 0.65,
    transform: [{ rotate: '38deg' }],
  },
  bgBlob: {
    position: 'absolute',
    top: 40,
    right: -45,
    width: 140,
    height: 180,
    borderRadius: 70,
    backgroundColor: '#EFF4E3',
    opacity: 0.5,
  },

  // Tag Badge Pill
  tagBadge: {
    backgroundColor: THEME.tagBg,
    borderColor: THEME.tagBorder,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagBadgeText: {
    color: THEME.tagText,
    fontWeight: '700',
    letterSpacing: 1.1,
  },

  // Headlines
  headlineWrap: {
    alignItems: 'center',
  },
  headlineDark: {
    fontWeight: '800',
    color: THEME.titleDark,
    textAlign: 'center',
    letterSpacing: -0.6,
  },
  headlineGreen: {
    fontWeight: '800',
    color: THEME.titleGreen,
    textAlign: 'center',
    letterSpacing: -0.6,
  },

  // Subtitle
  subtitleWrap: {
    alignItems: 'center',
  },
  subtitleText: {
    fontWeight: '400',
    color: THEME.subtitle,
    textAlign: 'center',
  },

  // Illustration — fixed height supplied inline, always contained
  illustrationWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  illustration: {
    width: '100%',
    height: '100%',
  },

  // Features list
  featuresSection: {
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureIconBox: {
    backgroundColor: THEME.iconBg,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  featureCopy: {
    flex: 1,
  },
  featureTitle: {
    fontWeight: '700',
    color: THEME.itemTitle,
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  featureDesc: {
    color: THEME.itemDesc,
    fontWeight: '400',
  },
  featureDivider: {
    height: 1,
    backgroundColor: THEME.divider,
    width: '100%',
  },

  // CTA
  actionWrap: {
    width: '100%',
    gap: 6,
    marginTop: 4,
  },
  button: {
    backgroundColor: THEME.buttonBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#283210',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 2,
  },
  buttonPressed: {
    backgroundColor: THEME.buttonPressed,
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  buttonText: {
    color: THEME.buttonText,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  reviewerBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
  },
  reviewerBtnText: {
    color: '#8A947A',
    fontSize: 12.5,
    fontWeight: '500',
  },
});
