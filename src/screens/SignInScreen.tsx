import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Image, Pressable, ActivityIndicator, ScrollView,
  StyleSheet, Platform, UIManager, StatusBar, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { randomUUID } from 'expo-crypto';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { GoogleLogo, BizoraMark } from '../components/illustrations/BrandAssets';
import { completeGoogleSignIn } from '../services/googleSignIn';
import { parseGoogleCallback } from '../utils/oauth';
import { Palette } from '../constants/colors';
import { APP_NAME, APP_TAGLINE } from '../constants/app';
import { getPendingJoin } from '../services/workplaceLinks';

WebBrowser.maybeCompleteAuthSession();

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '667573150359-4cff25jgf98hqq00pdrnojslk4bri5sb.apps.googleusercontent.com';
const GOOGLE_CALLBACK_URL = process.env.EXPO_PUBLIC_GOOGLE_CALLBACK_URL || 'https://www.attendance-tracker.shivamshankhdhar.online/api/v1/auth/google/callback';

const FEATURES = [
  { icon: 'users' as const, label: 'Manage\nTeams' },
  { icon: 'clock' as const, label: 'Track\nAttendance' },
  { icon: 'bar-chart-2' as const, label: 'Stay\nOrganized' },
];

interface SignInScreenProps {
  onNavigateToPinLogin: () => void;
  onNavigateToReviewer: () => void;
}

export function SignInScreen({ onNavigateToPinLogin, onNavigateToReviewer }: SignInScreenProps) {
  const { width: screenWidth } = useWindowDimensions();
  const isLoading = useAuthStore(state => state.isLoading);
  const [error, setError] = useState<string | null>(null);
  const [browserLoading, setBrowserLoading] = useState(false);
  const [hasPendingInvite, setHasPendingInvite] = useState(false);
  const requestActive = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    getPendingJoin().then((token) => {
      if (mounted.current && token) {
        setHasPendingInvite(true);
      }
    }).catch(() => {});
    return () => { mounted.current = false; };
  }, []);
  const busy = isLoading || browserLoading;

  const illustrationHeight = Math.min(270, Math.max(220, Math.round(screenWidth * 0.58)));

  const signIn = async () => {
    if (requestActive.current || isLoading) return;
    requestActive.current = true;
    setError(null); setBrowserLoading(true);
    try {
      const returnUrl = Linking.createURL('auth');
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: GOOGLE_CALLBACK_URL,
        response_type: 'id_token',
        scope: 'openid email profile',
        prompt: 'select_account',
        nonce: randomUUID(),
        state: returnUrl,
      });
      const result = await WebBrowser.openAuthSessionAsync(
        `https://accounts.google.com/o/oauth2/v2/auth?${params}`, returnUrl
      );
      if (result.type !== 'success') return;
      const callback = parseGoogleCallback(result.url);
      if (callback.error) throw new Error(callback.errorDescription || "Google couldn't complete sign-in. Please try again.");
      if (!callback.idToken) throw new Error("Google didn't return your account details. Please try again.");
      await completeGoogleSignIn(callback.idToken);
    } catch (err) {
      if (mounted.current) setError(err instanceof Error ? err.message : 'Unable to sign in. Please try again.');
    } finally {
      requestActive.current = false;
      if (mounted.current) setBrowserLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7EE" />

      {/* Decorative arts — fixed to screen corners, not scrollable */}
      <Image
        source={require('../../assets/images/signin_topright_art.png')}
        style={styles.topRightArt}
        resizeMode="contain"
        accessible={false}
      />
      <Image
        source={require('../../assets/images/signin_botleft_foliage.png')}
        style={styles.botLeftArt}
        resizeMode="contain"
        accessible={false}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={{ zIndex: 1 }}
      >
        {/* Brand mark */}
        <View style={styles.brandRow}>
          <BizoraMark size={28} />
        </View>

        {/* Hero headline */}
        <View style={styles.hero}>
          <Text style={styles.heroGreen}>{APP_NAME}</Text>
          <Text style={styles.heroSub}>{APP_TAGLINE}</Text>
        </View>

        {/* Feature pills */}
        <View style={styles.featureRow}>
          {FEATURES.map(({ icon, label }) => (
            <View key={icon} style={styles.featurePill}>
              <View style={styles.featureIconBg}>
                <Feather name={icon} size={20} color={Palette.brandPrimary} />
              </View>
              <Text style={styles.featureLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Storefront illustration — full device width */}
        <View style={[styles.illustrationWrap, { width: screenWidth, height: illustrationHeight }]}>
          <Image
            source={require('../../assets/images/signin_storefront_3d.png')}
            style={[styles.illustration, { width: screenWidth, height: illustrationHeight }]}
            resizeMode="cover"
            accessible={false}
          />
        </View>

        {/* Pending Invite Notice */}
        {hasPendingInvite && (
          <View style={styles.inviteNoticeBanner}>
            <View style={styles.inviteNoticeIconWrap}>
              <Feather name="mail" size={18} color="#2D5A27" />
            </View>
            <View style={styles.inviteNoticeTextWrap}>
              <Text style={styles.inviteNoticeTitle}>Workplace Invitation</Text>
              <Text style={styles.inviteNoticeBody}>
                First you need to sign in and then only will accept the invitation
              </Text>
            </View>
          </View>
        )}

        {/* Error */}
        {error && (
          <View accessibilityRole="alert" style={styles.error}>
            <Feather name="alert-circle" size={16} color={Palette.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Continue with Google */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
          accessibilityState={{ busy, disabled: busy }}
          onPress={signIn}
          disabled={busy}
          style={({ pressed }) => [styles.googleBtn, pressed && styles.pressed, busy && styles.disabled]}
        >
          <View style={styles.googleIconWrap}>
            {busy ? <ActivityIndicator size="small" color={Palette.brandPrimary} /> : <GoogleLogo size={22} />}
          </View>
          <Text style={styles.googleBtnText}>
            {busy ? (isLoading ? 'Signing you in…' : 'Connecting to Google…') : 'Continue with Google'}
          </Text>
          {!busy && <Feather name="chevron-right" size={20} color="#fff" style={styles.googleArrow} />}
        </Pressable>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.divLine} />
          <Text style={styles.divText}>or</Text>
          <View style={styles.divLine} />
        </View>

        {/* Employee PIN */}
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onNavigateToPinLogin}
          style={({ pressed }) => [styles.pinBtn, pressed && styles.pressed, busy && styles.disabled]}
        >
          <View style={styles.pinIconWrap}>
            <Feather name="grid" size={20} color={Palette.brandPrimary} />
          </View>
          <Text style={styles.pinBtnText}>Use employee ID + PIN</Text>
          <Feather name="chevron-right" size={18} color={Palette.textSecondary} />
        </Pressable>

        {/* Reviewer login link */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reviewer Login"
          onPress={onNavigateToReviewer}
          style={({ pressed }) => [styles.reviewerLink, pressed && { opacity: 0.6 }]}
        >
          <Feather name="shield" size={12} color={Palette.textSecondary} />
          <Text style={styles.reviewerLinkText}>Reviewer Login</Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F7EE' },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 120 },

  topRightArt: {
    position: 'absolute', top: 0, right: 0,
    width: 130, height: 130, opacity: 0.65,
    zIndex: 0,
  },
  botLeftArt: {
    position: 'absolute', bottom: 0, left: 0,
    width: 90, height: 100, opacity: 0.55,
    zIndex: 0,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EDF2E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { },

  hero: { marginTop: 8, marginBottom: 22, gap: 0 },
  heroGreen: { fontSize: 40, fontWeight: '800', color: Palette.brandPrimary, lineHeight: 44, letterSpacing: -1 },
  heroSub: { fontSize: 15, color: '#6B7A5A', marginTop: 4, fontWeight: '400' },

  featureRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  featurePill: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 6,
    shadowColor: '#1B2210',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  featureIconBg: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#EDF2E4',
    alignItems: 'center', justifyContent: 'center',
  },
  featureLabel: {
    fontSize: 11, fontWeight: '600', color: '#3B4A2E',
    textAlign: 'center', lineHeight: 15,
  },

  illustrationWrap: {
    marginHorizontal: -24,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 16,
    backgroundColor: '#F5F7EE',
  },
  illustration: {
    alignSelf: 'center',
  },

  inviteNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EBF4DD',
    borderWidth: 1.5,
    borderColor: '#C2D9A1',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#2D5A27',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  inviteNoticeIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#DCF0C3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteNoticeTextWrap: {
    flex: 1,
    gap: 2,
  },
  inviteNoticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1B2210',
  },
  inviteNoticeBody: {
    fontSize: 12.5,
    lineHeight: 17,
    color: '#3B4A2E',
    fontWeight: '500',
  },

  error: {
    flexDirection: 'row', gap: 8,
    backgroundColor: Palette.dangerTint, padding: 12,
    borderRadius: 12, marginBottom: 12,
  },
  errorText: { flex: 1, color: Palette.danger, fontSize: 13, lineHeight: 19 },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Palette.brandPrimary,
    borderRadius: 16,
    height: 58,
    paddingHorizontal: 16,
    marginBottom: 14,
    shadowColor: Palette.brandPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  googleIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  googleBtnText: {
    flex: 1,
    color: '#fff', fontSize: 16, fontWeight: '700',
    textAlign: 'center',
    marginLeft: -36, // optical centering with the icon on left
  },
  googleArrow: { opacity: 0.7 },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  divLine: { flex: 1, height: 1, backgroundColor: '#D5DEC8' },
  divText: { color: '#8A9978', fontSize: 13 },

  pinBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    height: 58,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#D5DEC8',
    gap: 12,
    shadowColor: '#1B2210',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  pinIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#EDF2E4',
    alignItems: 'center', justifyContent: 'center',
  },
  pinBtnText: { flex: 1, color: Palette.textPrimary, fontSize: 15, fontWeight: '600' },

  reviewerLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 6,
  },
  reviewerLinkText: {
    color: '#8A9978', fontSize: 11, fontWeight: '500',
    textDecorationLine: 'underline',
  },

  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.65 },
});
