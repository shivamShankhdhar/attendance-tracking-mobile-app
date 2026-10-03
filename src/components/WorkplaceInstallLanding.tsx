import React, { useState, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { apiRequest } from '../services/api';
import { PLAY_STORE_URL, getWorkplaceLink, savePendingJoin } from '../services/workplaceLinks';
import { Palette } from '../constants/colors';
import { StoreEnvelopeIllustration, ExpiredInviteDocIllustration } from './illustrations/IllustrationAssets';

const subscribe = () => () => {};
const detectPlatform = () => {
  const agent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  return /android/i.test(agent) ? 'android' : /iPad|iPhone|iPod/i.test(agent) ? 'ios' : 'desktop';
};

interface Preview { workplaceName: string; workplaceCode?: string; address?: string; description?: string; installLink?: string }
export function WorkplaceInstallLanding({ token, onContinue }: { token: string; onContinue: () => void }) {
  const [openError, setError] = useState('');
  const platform = useSyncExternalStore(subscribe, detectPlatform, () => 'desktop');
  const { data: preview, error: requestError, isPending: loading } = useQuery({
    queryKey: ['public-join-landing', token],
    queryFn: () => apiRequest<Preview>('/workplaces/join-landing', { method: 'POST', body: { token }, skipAuth: true }),
    retry: false,
    staleTime: 60_000,
  });
  const error = openError || requestError?.message;
  const open = async (url: string) => {
    try {
      if (!url || /replace_me|id0000000000/.test(url)) {
        setError('The app listing is not available yet. You can continue in your browser.');
        return;
      }
      await savePendingJoin(token);
      await Linking.openURL(url);
    } catch { setError('Unable to open the app. Install it below, then return to this invitation.'); }
  };
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <View style={styles.artworkContainer}>
          {error ? (
            <ExpiredInviteDocIllustration size={130} />
          ) : (
            <StoreEnvelopeIllustration size={130} />
          )}
        </View>

        <View style={styles.badgePill}>
          <View style={styles.pulseDot} />
          <Text style={styles.badgeText}>Workplace Invitation</Text>
        </View>

        <Text style={styles.title}>{preview ? preview.workplaceName : 'Workplace Invitation'}</Text>

        {loading && <ActivityIndicator color={Palette.brandPrimary} style={{ marginVertical: 8 }} />}
        
        {preview?.description ? (
          <Text style={styles.description}>{preview.description}</Text>
        ) : null}

        {preview?.address ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Location</Text>
            <Text style={styles.infoValue}>{preview.address}</Text>
          </View>
        ) : null}

        {preview?.workplaceCode ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Workplace Code</Text>
            <Text selectable style={styles.codeText}>{preview.workplaceCode}</Text>
          </View>
        ) : null}

        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

        {preview && (
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" style={styles.buttonPrimary} onPress={() => void open(getWorkplaceLink(token, true))}>
              <Text style={styles.buttonPrimaryText}>Open in Bizora App</Text>
            </Pressable>
            
            <Text style={styles.helperText}>
              {preview.installLink
                ? 'Install Bizora to continue with this invitation after sign-in.'
                : 'Install Bizora, then return to this invitation and tap Open in Bizora. Your workplace details will continue after sign-in.'}
            </Text>

            {platform !== 'ios' && (
              <Pressable accessibilityRole="link" style={styles.buttonSecondary} onPress={() => void open(preview.installLink || PLAY_STORE_URL)}>
                <Text style={styles.buttonSecondaryText}>Get it on Google Play</Text>
              </Pressable>
            )}

            <Pressable accessibilityRole="button" style={styles.textButton} onPress={onContinue}>
              <Text style={styles.textButtonText}>Continue in browser →</Text>
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: Palette.canvas },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    shadowColor: '#1B2210',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 18,
    elevation: 2,
  },
  artworkContainer: {
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDF3DF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
    gap: 6,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#5B692D',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B451B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Palette.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: Palette.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  infoRow: {
    width: '100%',
    backgroundColor: '#F8F9F3',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    color: Palette.textPrimary,
    fontWeight: '600',
    maxWidth: '65%',
    textAlign: 'right',
  },
  codeText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
    color: Palette.brandPrimary,
  },
  error: { color: Palette.danger, fontSize: 13.5, marginVertical: 8, textAlign: 'center' },
  actions: { width: '100%', gap: 10, marginTop: 14 },
  buttonPrimary: {
    backgroundColor: Palette.brandPrimary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: Palette.brandPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonPrimaryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  helperText: {
    fontSize: 12.5,
    lineHeight: 18,
    color: Palette.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  buttonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Palette.border,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  buttonSecondaryText: { color: Palette.textPrimary, fontWeight: '600', fontSize: 14 },
  textButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  textButtonText: { color: Palette.brandPrimary, fontWeight: '600', fontSize: 13.5 },
});
