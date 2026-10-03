import React, { useState } from 'react';
import { Redirect, useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { Text, View, StyleSheet, Platform, Share, Linking } from 'react-native';
import { DetailPage, DetailSection, DetailRow } from '../components/DetailPage';
import { useAuthStore } from '../stores/authStore';
import { Palette } from '../constants/colors';
import { Avatar } from '../components/Avatar';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { AboutModal } from '../components/AboutModal';
import { PLAY_STORE_URL, APP_STORE_URL } from '../services/workplaceLinks';
import { APP_NAME, PRIVACY_POLICY_URL, ABOUT_URL } from '../constants/app';
import { copyToClipboard } from '../utils/clipboard';
import { showSuccess } from '../stores/alertStore';

export default function AppSettingsRoute() {
  const router = useRouter();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const user = useAuthStore((s) => s.user);
  const memberships = useAuthStore((s) => s.memberships);
  const authenticated = useAuthStore((s) => s.isAuthenticated);

  const activeWorkplacesCount = memberships.filter((m) => m.status === 'ACTIVE').length;

  const handleCopyEmail = async () => {
    if (!user?.email) return;
    if (await copyToClipboard(user.email)) showSuccess('Email address copied to clipboard.');
  };

  const handleCopyPhone = async () => {
    if (!user?.phone) return;
    if (await copyToClipboard(user.phone)) showSuccess('Phone number copied to clipboard.');
  };

  const handleShareApp = async () => {
    const isIos = Platform.OS === 'ios';
    const storeUrl = isIos ? APP_STORE_URL : PLAY_STORE_URL;
    const appName = APP_NAME;
    const message = `Check out ${appName} — smart attendance tracking, QR check-in & workplace management!\n\nDownload: ${storeUrl}`;

    try {
      if (isIos) {
        await Share.share({
          title: `Share ${appName}`,
          message,
          url: storeUrl,
        });
      } else {
        await Share.share({
          title: `Share ${appName}`,
          message,
        });
      }
    } catch {
      // Ignored if user cancels share sheet
    }
  };

  const handleOpenPrivacy = () => {
    void Linking.openURL(PRIVACY_POLICY_URL);
  };

  const handleOpenWebsite = () => {
    void Linking.openURL(ABOUT_URL);
  };

  if (!authenticated || !user) return <Redirect href="/" />;

  return (
    <DetailPage title="Settings" subtitle="Your account, preferences and app information.">
      <View style={[styles.profile, { backgroundColor: Palette.surface, borderColor: Palette.border }]}>
        <Avatar name={user.name} avatarUrl={user.avatarUrl} size="xl" />
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: Palette.textPrimary }]}>{user.name}</Text>
          <Text style={[styles.meta, { color: Palette.textSecondary }]}>{user.email || user.phone || 'Signed in'}</Text>
        </View>
      </View>

      {/* USER SPECIFIC OPTIONS AT TOP */}
      <DetailSection title="Account & Profile">
        <DetailRow icon="user" label="Full name" value={user.name} />
        <DetailRow
          icon="mail"
          label="Email address"
          value={user.email || 'Not provided'}
          onPress={user.email ? handleCopyEmail : undefined}
          actionIcon={user.email ? 'copy' : undefined}
          actionLabel="Copy email address"
        />
        {user.phone ? (
          <DetailRow
            icon="phone"
            label="Phone number"
            value={user.phone}
            onPress={handleCopyPhone}
            actionIcon="copy"
            actionLabel="Copy phone number"
          />
        ) : null}
        <DetailRow
          icon="inbox"
          label="My join requests"
          value="Track your workplace access"
          onPress={() => router.push('/my-join-requests')}
        />
        <DetailRow
          icon="briefcase"
          label="Linked workplaces"
          value={`${activeWorkplacesCount} active ${activeWorkplacesCount === 1 ? 'workplace' : 'workplaces'}`}
        />
      </DetailSection>

      <DetailSection title="Security">
        <DetailRow
          icon="shield"
          label="Security & app lock"
          value={user.hasMpin ? 'Protected (MPIN active)' : 'MPIN, face and fingerprint'}
          onPress={() => router.push('/security')}
        />
      </DetailSection>

      <DetailSection title="About">
        <DetailRow
          icon="info"
          label={`About ${APP_NAME}`}
          value="Features, security overview & website"
          onPress={() => setShowAboutModal(true)}
        />
        <DetailRow
          icon="globe"
          label="Official website"
          value="bizora.shivamshankhdhar.online"
          actionIcon="external-link"
          onPress={handleOpenWebsite}
        />
        <DetailRow
          icon="lock"
          label="Privacy policy"
          value="AdMob disclosure, data usage & rights"
          actionIcon="external-link"
          onPress={handleOpenPrivacy}
        />
        <DetailRow
          icon="share-2"
          label="Share app"
          value={Platform.OS === 'ios' ? 'Share Apple App Store link' : 'Share Google Play link'}
          onPress={handleShareApp}
        />
        <DetailRow icon="code" label="App version" value={Constants.expoConfig?.version || '1.0.0'} />
      </DetailSection>

      <DetailSection title="Session">
        <DetailRow icon="log-out" label="Sign out" danger onPress={() => setShowSignOutConfirm(true)} />
      </DetailSection>

      <AboutModal visible={showAboutModal} onClose={() => setShowAboutModal(false)} />

      <ConfirmDialog
        visible={showSignOutConfirm}
        title="Sign out"
        message="Are you sure you want to sign out? You will need to sign in again to access your workplaces."
        confirmLabel="Sign out"
        cancelLabel="Cancel"
        isDestructive
        onConfirm={() => {
          setShowSignOutConfirm(false);
          router.replace('/signout');
        }}
        onCancel={() => setShowSignOutConfirm(false)}
      />
    </DetailPage>
  );
}


const styles = StyleSheet.create({
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  name: {
    fontSize: 19,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  meta: {
    fontSize: 13,
    color: Palette.textSecondary,
    marginTop: 4,
  },
});

