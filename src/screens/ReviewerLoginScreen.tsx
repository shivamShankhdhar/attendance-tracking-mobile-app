import React, { useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ActivityIndicator,
  StyleSheet, ScrollView, Keyboard, Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { BizoraMark } from '../components/illustrations/BrandAssets';
import { Palette } from '../constants/colors';
import { validateReviewerCredentials, loginWithReviewerCredentials } from '../services/reviewerLogin';

const ACCOUNTS = [
  {
    email: 'reviewer_employer@test.com',
    label: 'Employer',
    role: 'Full employer dashboard access',
    icon: 'briefcase' as const,
    color: '#3B82F6',
    bg: '#EFF6FF',
  },
  {
    email: 'reviewer_employee@test.com',
    label: 'Employee',
    role: 'Employee attendance dashboard',
    icon: 'user' as const,
    color: '#10B981',
    bg: '#ECFDF5',
  },
];

interface ReviewerLoginScreenProps {
  onBack: () => void;
}

export function ReviewerLoginScreen({ onBack }: ReviewerLoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const handleLogin = async (overrideEmail?: string) => {
    Keyboard.dismiss();
    const targetEmail = overrideEmail ?? email;
    const targetPassword = overrideEmail ? 'ReviewPass123!' : password;
    const validationError = validateReviewerCredentials(targetEmail, targetPassword);
    if (validationError) { setError(validationError); return; }
    setError(null);
    setLoading(true);
    try {
      await loginWithReviewerCredentials(targetEmail.trim().toLowerCase());
    } catch (err) {
      if (mounted.current) setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  const quickLogin = (accountEmail: string) => {
    setEmail(accountEmail);
    setPassword('ReviewPass123!');
    void handleLogin(accountEmail);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFB" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          hitSlop={12}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <Feather name="arrow-left" size={22} color="#1B2210" />
        </Pressable>
        <View style={styles.headerBrand}>
          <BizoraMark size={22} />
          <Text style={styles.headerTitle}>Reviewer Access</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title block */}
        <View style={styles.titleBlock}>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Feather name="shield" size={13} color={Palette.brandPrimary} />
              <Text style={styles.badgeText}>Google Play Review</Text>
            </View>
          </View>
          <Text style={styles.title}>Demo Login</Text>
          <Text style={styles.subtitle}>
            Bypass Google OAuth entirely. Choose an account type or enter credentials manually below.
          </Text>
        </View>

        {/* Quick-login account cards */}
        <Text style={styles.sectionLabel}>QUICK ACCESS</Text>
        <View style={styles.accountCards}>
          {ACCOUNTS.map(account => (
            <Pressable
              key={account.email}
              accessibilityRole="button"
              accessibilityLabel={`Quick login as ${account.label}`}
              onPress={() => quickLogin(account.email)}
              disabled={loading}
              style={({ pressed }) => [
                styles.accountCard,
                pressed && { opacity: 0.85 },
                loading && { opacity: 0.6 },
              ]}
            >
              <View style={[styles.accountIconWrap, { backgroundColor: account.bg }]}>
                <Feather name={account.icon} size={22} color={account.color} />
              </View>
              <View style={styles.accountInfo}>
                <Text style={styles.accountLabel}>{account.label} Account</Text>
                <Text style={styles.accountRole}>{account.role}</Text>
                <Text style={styles.accountEmail} numberOfLines={1}>{account.email}</Text>
              </View>
              {loading
                ? <ActivityIndicator size="small" color={Palette.brandPrimary} />
                : <View style={[styles.loginTag, { backgroundColor: account.bg }]}>
                    <Text style={[styles.loginTagText, { color: account.color }]}>Log in</Text>
                  </View>
              }
            </Pressable>
          ))}
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.divLine} />
          <Text style={styles.divText}>or enter manually</Text>
          <View style={styles.divLine} />
        </View>

        {/* Manual form */}
        <View style={styles.form}>
          {error && (
            <View accessibilityRole="alert" style={styles.errorBox}>
              <Feather name="alert-circle" size={15} color={Palette.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              accessibilityLabel="Reviewer email address"
              style={styles.input}
              placeholder="reviewer_employer@test.com"
              placeholderTextColor="#A3AE93"
              value={email}
              onChangeText={text => { setEmail(text); setError(null); }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!loading}
              returnKeyType="next"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Password</Text>
            <TextInput
              accessibilityLabel="Reviewer password"
              style={styles.input}
              placeholder="ReviewPass123!"
              placeholderTextColor="#A3AE93"
              value={password}
              onChangeText={text => { setPassword(text); setError(null); }}
              secureTextEntry
              autoCorrect={false}
              autoComplete="off"
              spellCheck={false}
              autoCapitalize="none"
              textContentType="password"
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={() => handleLogin()}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign in as reviewer"
            disabled={loading || !email || !password}
            onPress={() => handleLogin()}
            style={({ pressed }) => [
              styles.submitBtn,
              pressed && { opacity: 0.85 },
              (loading || !email || !password) && { opacity: 0.55 },
            ]}
          >
            {loading
              ? <ActivityIndicator size="small" color="#fff" />
              : <><Feather name="log-in" size={18} color="#fff" /><Text style={styles.submitText}>Sign in as Reviewer</Text></>
            }
          </Pressable>
        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          <Feather name="info" size={14} color={Palette.brandPrimary} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.infoTitle}>About reviewer accounts</Text>
            <Text style={styles.infoText}>
              These credentials are for Google Play Console reviewers only. They bypass Google OAuth,
              phone verification, and 2FA. Sessions persist across app restarts.
            </Text>
            <Text style={styles.infoCreds}>Password for all accounts: ReviewPass123!</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFB' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#E8EDE0',
    backgroundColor: '#F8FAFB',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#EDF2E4',
    alignItems: 'center', justifyContent: 'center',
  },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1B2210' },

  scroll: { padding: 20, gap: 0, flexGrow: 1 },

  titleBlock: { marginBottom: 20, gap: 8 },
  badgeRow: { flexDirection: 'row' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#EDF2E4', borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 11, fontWeight: '600', color: Palette.brandPrimary },
  title: { fontSize: 28, fontWeight: '800', color: '#1B2210', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#6B7A5A', lineHeight: 20 },

  sectionLabel: {
    fontSize: 10, fontWeight: '700', color: '#A3AE93',
    letterSpacing: 0.8, marginBottom: 10,
  },

  accountCards: { gap: 10, marginBottom: 24 },
  accountCard: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14, padding: 14,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1.5, borderColor: '#E8EDE0',
    shadowColor: '#1B2210',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  accountIconWrap: {
    width: 50, height: 50, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  accountInfo: { flex: 1, gap: 2 },
  accountLabel: { fontSize: 15, fontWeight: '700', color: '#1B2210' },
  accountRole: { fontSize: 12, color: '#6B7A5A' },
  accountEmail: { fontSize: 11, color: '#A3AE93', marginTop: 2 },
  loginTag: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8,
  },
  loginTagText: { fontSize: 12, fontWeight: '700' },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  divLine: { flex: 1, height: 1, backgroundColor: '#D5DEC8' },
  divText: { color: '#8A9978', fontSize: 12 },

  form: { gap: 14 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#4A5A3A', letterSpacing: 0.2 },
  input: {
    height: 52, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: '#D5DEC8',
    borderRadius: 14, paddingHorizontal: 14,
    fontSize: 14, color: '#1B2210',
  },

  errorBox: {
    flexDirection: 'row', gap: 8,
    backgroundColor: Palette.dangerTint,
    padding: 12, borderRadius: 12,
  },
  errorText: { flex: 1, color: Palette.danger, fontSize: 13, lineHeight: 19 },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 54,
    backgroundColor: '#2B3A1E',
    borderRadius: 14,
    marginTop: 4,
    shadowColor: '#2B3A1E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  infoCard: {
    flexDirection: 'row', gap: 10,
    backgroundColor: '#EDF2E4',
    borderRadius: 14, padding: 14,
    marginTop: 24,
    borderWidth: 1, borderColor: '#D0DCBE',
  },
  infoTitle: { fontSize: 13, fontWeight: '700', color: '#2B3A1E' },
  infoText: { fontSize: 12, color: '#4A5A3A', lineHeight: 18 },
  infoCreds: { fontSize: 12, fontWeight: '700', color: Palette.brandPrimary, marginTop: 4 },
});
