import { useRouter } from 'expo-router';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../stores/authStore';
import { apiRequest } from '../services/api';
import { attendanceApi } from '../services/attendanceApi';
import { showError, showSuccess } from '../stores/alertStore';
import { Palette } from '../constants/colors';
import {
  InviteEnvelopeIllustration,
  InviteFailedIllustration,
} from '../components/illustrations/IllustrationAssets';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { copyToClipboard } from '../utils/clipboard';
import { parseWorkplaceInvite, savePendingJoin } from '../services/workplaceLinks';
import { JoinWorkplaceModal } from '../components/JoinWorkplaceModal';
import { AdBanner } from '../components/AdBanner';
import { adMobService } from '../services/adMobService';

type OnboardingStep = 'welcome-chooser' | 'create-workplace' | 'invited' | 'invite-invalid';

interface PendingInviteData {
  invitationId?: string;
  workplaceId?: string;
  workplaceName?: string;
  workplaceCode?: string;
  adminName?: string;
  address?: string;
  timezone?: string;
  role?: string;
  invitedEmail?: string;
  invitationToken?: string;
}

export function OnboardingScreen({ initialStep = 'welcome-chooser' }: { initialStep?: OnboardingStep }) {
  const router = useRouter();
  const { user, memberships, refreshProfile, selectWorkplace, logout, setOnboardingInitialStep } = useAuthStore();

  const invitedMembership = memberships.find((m) => m.status === 'INVITED');
  const [step, setStep] = useState<OnboardingStep>(
    initialStep === 'welcome-chooser' && invitedMembership ? 'invited' : initialStep
  );
  const [submitting, setSubmitting] = useState(false);

  // Screen 3: Create Workplace Form States
  const [wpName, setWpName] = useState('');
  const [wpAddress, setWpAddress] = useState('');

  // Screen 4 & 6: Invite Details
  const [pendingInvite, setPendingInvite] = useState<PendingInviteData | null>(() => {
    if (invitedMembership) {
      return {
        workplaceId: invitedMembership.workplaceId,
        workplaceName: invitedMembership.workplaceName,
        workplaceCode: invitedMembership.workplaceCode || invitedMembership.workplaceId.slice(-6).toUpperCase(),
        adminName: invitedMembership.adminName || 'Workplace Admin',
        role: invitedMembership.role || 'Employee',
        invitedEmail: user?.email || '',
      };
    }
    return null;
  });
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [manualInviteCode, setManualInviteCode] = useState('');
  const [helpModalVisible, setHelpModalVisible] = useState(false);

  // Join Another Workplace options on invitation screen
  const [permission, requestPermission] = useCameraPermissions();
  const [anotherMethod, setAnotherMethod] = useState<'code' | 'qr' | 'link'>('code');
  const [inputCode, setInputCode] = useState('');
  const [inputLink, setInputLink] = useState('');
  const [submittingAnother, setSubmittingAnother] = useState(false);
  const scanningLock = useRef(false);

  // Candidate Join Request status
  const [pendingJoinRequest, setPendingJoinRequest] = useState<{
    id: string;
    workplaceId: string;
    workplaceName: string;
    address?: string;
    status: string;
    requestedAt?: string;
  } | null>(null);
  const [checkingPendingStatus, setCheckingPendingStatus] = useState(false);

  const fetchMyPendingJoinRequest = useCallback(async () => {
    try {
      const myRequests = await attendanceApi.getMyJoinRequests();
      const pending = myRequests.find((r) => r.status === 'PENDING');
      if (pending) {
        setPendingJoinRequest(pending);
      } else {
        setPendingJoinRequest(null);
      }
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    fetchMyPendingJoinRequest();
  }, [fetchMyPendingJoinRequest]);

  const handleCheckPendingStatus = async () => {
    try {
      setCheckingPendingStatus(true);
      await refreshProfile();
      const myRequests = await attendanceApi.getMyJoinRequests();
      const target = myRequests.find((r) => r.id === pendingJoinRequest?.id);

      if (target?.status === 'APPROVED') {
        showSuccess(`Your request to join ${target.workplaceName} was approved!`);
        const updated = useAuthStore.getState().memberships;
        const targetM = updated.find((m) => m.workplaceId === target.workplaceId && m.status === 'ACTIVE');
        if (targetM) {
          selectWorkplace(targetM);
        }
        return;
      }

      if (target?.status === 'REJECTED') {
        showError(`Your request was declined: ${target.rejectionReason || 'No reason specified'}`);
        setPendingJoinRequest(null);
        return;
      }

      showSuccess('Your request is still awaiting employer approval.');
    } catch (err: any) {
      showError(err.message || 'Failed to check status');
    } finally {
      setCheckingPendingStatus(false);
    }
  };

  const handleCancelPendingRequest = async () => {
    if (!pendingJoinRequest) return;
    try {
      setCheckingPendingStatus(true);
      await attendanceApi.cancelMyJoinRequest(pendingJoinRequest.id);
      showSuccess('Join request cancelled.');
      setPendingJoinRequest(null);
    } catch (err: any) {
      showError(err.message || 'Failed to cancel request');
    } finally {
      setCheckingPendingStatus(false);
    }
  };

  // Look for any existing invited membership on mount
  useEffect(() => {
    const invitedMembership = memberships.find((m) => m.status === 'INVITED');
    if (invitedMembership) {
      setPendingInvite({
        workplaceId: invitedMembership.workplaceId,
        workplaceName: invitedMembership.workplaceName,
        workplaceCode: (invitedMembership as any).workplaceCode || invitedMembership.workplaceId.slice(-6).toUpperCase(),
        adminName: (invitedMembership as any).adminName || 'Workplace Admin',
        role: invitedMembership.role || 'Employee',
        invitedEmail: user?.email || '',
      });
      setStep('invited');
    }
  }, [memberships, user?.email]);

  // Suppress App Open ads when scanning QR code
  useEffect(() => {
    adMobService.setAppOpenAdSuppressed(anotherMethod === 'qr');
  }, [anotherMethod]);

  const handleCopyCode = async (code?: string) => {
    if (!code) return;
    try {
      const ok = await copyToClipboard(code);
      if (ok) {
        showSuccess('Workplace code copied to clipboard!');
      } else {
        showSuccess(`Code: ${code}`);
      }
    } catch {
      showError('Unable to copy code.');
    }
  };

  const handleJoinAnother = async (rawInput: string) => {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      showError('Please enter a workplace code, link, or token.');
      return;
    }
    setSubmittingAnother(true);
    try {
      const parsed = parseWorkplaceInvite(trimmed);
      if (!parsed) {
        showError('Invalid workplace code, QR, or invite link.');
        return;
      }
      await savePendingJoin(parsed);
      router.push({ pathname: '/join', params: { token: parsed } });
    } catch (err: any) {
      showError(err.message || 'Unable to join workplace.');
    } finally {
      setSubmittingAnother(false);
    }
  };

  const handleBarCodeScanned = async (data: string) => {
    if (scanningLock.current) return;
    scanningLock.current = true;
    try {
      const parsed = parseWorkplaceInvite(data);
      if (!parsed) {
        showError('Invalid QR code for workplace join.');
        scanningLock.current = false;
        return;
      }
      await savePendingJoin(parsed);
      router.push({ pathname: '/join', params: { token: parsed } });
    } catch {
      scanningLock.current = false;
    }
  };

  const firstName = user?.name ? user.name.split(' ')[0] : 'there';

  // --- Handlers ---

  const handleHelpPress = () => {
    setHelpModalVisible(true);
  };

  const handleBackFromChooser = () => {
    // If the user already has an active workplace in another membership, switch to it.
    // Never log out an already-authenticated user just because they pressed back here.
    const activeM = memberships.find((m) => m.status === 'ACTIVE');
    if (activeM) {
      setOnboardingInitialStep('welcome-chooser');
      selectWorkplace(activeM);
    }
    // If no active membership, just do nothing — they're authenticated and
    // pressing back shouldn't send them to the sign-in screen.
  };

  const handleJoinWorkplacePress = async () => {
    if (pendingInvite) {
      setStep('invited');
      return;
    }
    setJoinModalVisible(true);
  };

  const handleManualInviteClaim = async () => {
    if (!manualInviteCode.trim()) return;
    setInviteModalVisible(false);
    setSubmitting(true);

    try {
      let token = manualInviteCode.trim();
      if (token.includes('://')) {
        const url = new URL(token);
        token = url.searchParams.get('token') || url.pathname.split('/').filter(Boolean).pop() || '';
      }

      const res = await apiRequest<{
        message: string;
        workplaceId: string;
        role: 'EMPLOYER' | 'EMPLOYEE';
        name: string;
      }>('/workplaces/invitations/claim', {
        method: 'POST',
        body: { invitationToken: token },
      });

      await refreshProfile();
      const updatedMemberships = useAuthStore.getState().memberships;
      const target = updatedMemberships.find((m) => m.workplaceId === res.workplaceId && m.status === 'ACTIVE');
      if (target) {
        selectWorkplace(target);
      }
    } catch (err: any) {
      setPendingInvite({
        workplaceName: 'Workplace',
        invitedEmail: user?.email,
      });
      setStep('invite-invalid');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const res = await apiRequest<{
        message: string;
        workplaceId: string;
        role: 'EMPLOYER' | 'EMPLOYEE';
        name: string;
      }>('/workplaces/invitations/claim', {
        method: 'POST',
        body: {
          workplaceId: pendingInvite?.workplaceId,
          invitationToken: pendingInvite?.invitationToken,
        },
      });

      await refreshProfile();
      const updatedMemberships = useAuthStore.getState().memberships;
      const target = updatedMemberships.find((m) => m.workplaceId === res.workplaceId && m.status === 'ACTIVE');
      if (target) {
        selectWorkplace(target);
      }
    } catch {
      setStep('invite-invalid');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateWorkplace = async () => {
    if (submitting) return;
    if (!wpName.trim() || wpName.trim().length < 2) {
      showError('Please enter a workplace name with at least 2 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest<{
        workplace: { _id: string; name: string; timezone?: string };
        member: { _id: string; role: 'EMPLOYER'; status: 'ACTIVE' };
      }>('/workplaces', {
        method: 'POST',
        body: {
          name: wpName.trim(),
          address: wpAddress.trim() || undefined,
        },
      });

      // Directly update auth store and select the new workplace
      await refreshProfile();
      const updatedMemberships = useAuthStore.getState().memberships;
      const target =
        updatedMemberships.find((m) => m.workplaceId === res.workplace._id && m.status === 'ACTIVE') || {
          id: res.member._id,
          workplaceId: res.workplace._id,
          workplaceName: res.workplace.name,
          timezone: res.workplace.timezone || 'Asia/Kolkata',
          role: 'EMPLOYER' as const,
          status: 'ACTIVE' as const,
        };

      selectWorkplace(target);
    } catch (err: any) {
      showError(err.message || 'Unable to create workplace. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // SCREEN 3: Create your workplace Form
  // ==========================================
  if (step === 'create-workplace') {
    return (
      <SafeAreaView style={styles.outerContainer} edges={['top', 'left', 'right', 'bottom']}>
        {/* Top Bar with back arrow & Help (?) */}
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to options"
            onPress={() => {
              const activeM = memberships.find((m) => m.status === 'ACTIVE');
              if (activeM) {
                setOnboardingInitialStep('welcome-chooser');
                selectWorkplace(activeM);
              } else {
                setStep('welcome-chooser');
              }
            }}
            style={styles.iconBtn}
          >
            <Feather name="arrow-left" size={22} color="#17202A" />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={handleHelpPress}
            style={styles.helpLink}
          >
            <Text style={styles.helpText}>Help</Text>
            <Feather name="help-circle" size={17} color={Palette.brandPrimary} />
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.formScrollContent}
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerBlock}>
            <Text style={styles.screenTitle}>Create your workplace</Text>
            <Text style={styles.screenSubtitle}>
              Set up your business to start tracking attendance.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Workplace Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Workplace name</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Sharma General Store"
                  placeholderTextColor="#A89F9A"
                  value={wpName}
                  onChangeText={setWpName}
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Address (Optional) */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Address (optional)</Text>
              <View style={[styles.inputBox, styles.textAreaBox]}>
                <TextInput
                  style={[styles.textInput, styles.textAreaInput]}
                  placeholder={'e.g. Shop no. 12, MG Road,\nBengaluru, Karnataka'}
                  placeholderTextColor="#A89F9A"
                  value={wpAddress}
                  onChangeText={setWpAddress}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Create workplace CTA */}
            <Pressable
              accessibilityRole="button"
              disabled={submitting || !wpName.trim()}
              onPress={handleCreateWorkplace}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.btnPressed,
                (!wpName.trim() || submitting) && { opacity: 0.65 },
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Create workplace</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>

        {/* Ad pinned at very bottom with spacing */}
        <View style={styles.bottomAdWrap}>
          <AdBanner position="bottom" />
        </View>

        {/* Help Modal */}
        {renderHelpModal()}
      </SafeAreaView>
    );
  }

  // ==========================================
  // SCREEN 4: You've been invited!
  // ==========================================
  if (step === 'invited') {
    const inviteWorkplaceName = pendingInvite?.workplaceName || 'Workplace';
    const inviteWorkplaceCode = pendingInvite?.workplaceCode || (pendingInvite?.workplaceId ? pendingInvite.workplaceId.slice(-6).toUpperCase() : '');
    const inviteAdminName = pendingInvite?.adminName || 'Workplace Admin';
    const inviteRole = pendingInvite?.role || 'Employee';
    const inviteEmail = pendingInvite?.invitedEmail || user?.email || '';

    return (
      <SafeAreaView style={styles.outerContainer} edges={['top', 'left', 'right', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.invitedContainer}
          bounces={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Envelope Graphic with check badge & radiating rays */}
          <View style={styles.illustrationWrapper}>
            <InviteEnvelopeIllustration size={120} />
          </View>

          {/* Heading */}
          <Text style={styles.screenTitle}>You&apos;ve been invited!</Text>
          <Text style={styles.screenSubtitle}>
            You&apos;re invited to join this workplace.
          </Text>

          {/* Information Card (Screen 4) */}
          <View style={styles.infoCard}>
            {/* Workplace Row */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconTile}>
                <MaterialCommunityIcons name="storefront-outline" size={20} color={Palette.brandPrimary} />
              </View>
              <View style={styles.infoTextCol}>
                <Text style={styles.infoLabel}>Workplace</Text>
                <Text style={styles.infoValue}>{inviteWorkplaceName}</Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            {/* Workplace Code Row */}
            {Boolean(inviteWorkplaceCode) && (
              <>
                <View style={styles.infoRow}>
                  <View style={styles.infoIconTile}>
                    <MaterialCommunityIcons name="pound" size={19} color={Palette.brandPrimary} />
                  </View>
                  <View style={styles.infoTextCol}>
                    <Text style={styles.infoLabel}>Workplace code</Text>
                    <View style={styles.codeRowWithCopy}>
                      <Text style={styles.codeMonoValue}>{inviteWorkplaceCode}</Text>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => handleCopyCode(inviteWorkplaceCode)}
                        style={({ pressed }) => [styles.copyChip, pressed && { opacity: 0.7 }]}
                      >
                        <Feather name="copy" size={12} color={Palette.brandPrimary} />
                        <Text style={styles.copyChipText}>Copy</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>

                <View style={styles.cardDivider} />
              </>
            )}

            {/* Admin Who Invited Row */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconTile}>
                <MaterialCommunityIcons name="shield-account-outline" size={20} color={Palette.brandPrimary} />
              </View>
              <View style={styles.infoTextCol}>
                <Text style={styles.infoLabel}>Invited by (Admin)</Text>
                <Text style={styles.infoValue}>{inviteAdminName}</Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            {/* Role Row */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconTile}>
                <Feather name="user" size={18} color={Palette.brandPrimary} />
              </View>
              <View style={styles.infoTextCol}>
                <Text style={styles.infoLabel}>Your role</Text>
                <Text style={styles.infoValue}>{inviteRole}</Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            {/* Invited email Row */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconTile}>
                <Feather name="mail" size={18} color={Palette.brandPrimary} />
              </View>
              <View style={styles.infoTextCol}>
                <Text style={styles.infoLabel}>Invited email</Text>
                <Text style={styles.infoValue}>{inviteEmail}</Text>
              </View>
            </View>
          </View>

          {/* Green Notice Box: Instant activation, no approval required */}
          <View style={styles.greenNoticeBox}>
            <MaterialCommunityIcons name="check-decagram" size={18} color="#27AE60" style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.greenNoticeTitle}>Instant access · Pre-approved</Text>
              <Text style={styles.greenNoticeText}>
                No approval is required. You will be activated into {inviteWorkplaceName} immediately upon clicking below.
              </Text>
            </View>
          </View>

          {/* Action Button: Continue with Workplace (No approval needed!) */}
          <Pressable
            accessibilityRole="button"
            disabled={submitting}
            onPress={handleAcceptInvite}
            style={({ pressed }) => [
              styles.primaryBtn,
              { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
              pressed && styles.btnPressed,
              submitting && { opacity: 0.7 },
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.primaryBtnText}>
                  Continue with {inviteWorkplaceName}
                </Text>
                <Feather name="arrow-right" size={18} color="#FFFFFF" />
              </>
            )}
          </Pressable>

          {/* Option to join another workplace */}
          <View style={styles.joinAnotherCard}>
            <View style={styles.joinAnotherHeader}>
              <Text style={styles.joinAnotherTitle}>Join another workplace</Text>
              <Text style={styles.joinAnotherSubtitle}>
                Want to request access to a different organization?
              </Text>
            </View>

            {/* Segmented Switcher */}
            <View style={styles.joinTabsRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setAnotherMethod('code')}
                style={[styles.joinTabBtn, anotherMethod === 'code' && styles.joinTabBtnActive]}
              >
                <MaterialCommunityIcons
                  name="pound"
                  size={14}
                  color={anotherMethod === 'code' ? Palette.brandPrimary : Palette.textSecondary}
                />
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[styles.joinTabBtnText, anotherMethod === 'code' && styles.joinTabBtnTextActive]}
                >
                  Code
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={async () => {
                  setAnotherMethod('qr');
                  if (!permission?.granted) {
                    await requestPermission();
                  }
                }}
                style={[styles.joinTabBtn, anotherMethod === 'qr' && styles.joinTabBtnActive]}
              >
                <Feather
                  name="camera"
                  size={13}
                  color={anotherMethod === 'qr' ? Palette.brandPrimary : Palette.textSecondary}
                />
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[styles.joinTabBtnText, anotherMethod === 'qr' && styles.joinTabBtnTextActive]}
                >
                  Scan QR
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => setAnotherMethod('link')}
                style={[styles.joinTabBtn, anotherMethod === 'link' && styles.joinTabBtnActive]}
              >
                <Feather
                  name="link"
                  size={13}
                  color={anotherMethod === 'link' ? Palette.brandPrimary : Palette.textSecondary}
                />
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[styles.joinTabBtnText, anotherMethod === 'link' && styles.joinTabBtnTextActive]}
                >
                  Paste Link
                </Text>
              </Pressable>
            </View>

            {/* Tab 1: Workplace Code */}
            {anotherMethod === 'code' && (
              <View style={styles.tabContentWrap}>
                <Text style={styles.tabHelpText}>
                  Enter the 6-character workplace code from your employer (e.g. 5A3F9B)
                </Text>
                <View style={styles.inputWithActionRow}>
                  <TextInput
                    style={[styles.anotherInput, { textTransform: 'uppercase', letterSpacing: 2, fontWeight: '700' }]}
                    placeholder="ENTER CODE"
                    placeholderTextColor="#999"
                    value={inputCode}
                    onChangeText={(val) => setInputCode(val.toUpperCase())}
                    autoCapitalize="characters"
                    maxLength={10}
                  />
                  <Pressable
                    accessibilityRole="button"
                    disabled={!inputCode.trim() || submittingAnother}
                    onPress={() => handleJoinAnother(inputCode)}
                    style={({ pressed }) => [
                      styles.anotherSubmitBtn,
                      (!inputCode.trim() || submittingAnother) && { opacity: 0.5 },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    {submittingAnother ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.anotherSubmitBtnText}>Request</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}

            {/* Tab 2: Scan QR Code */}
            {anotherMethod === 'qr' && (
              <View style={styles.tabContentWrap}>
                {!permission?.granted ? (
                  <View style={styles.qrPermissionBox}>
                    <Feather name="camera-off" size={28} color={Palette.textSecondary} style={{ marginBottom: 6 }} />
                    <Text style={styles.qrPermissionText}>Camera permission is required to scan workplace QR codes.</Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={requestPermission}
                      style={styles.permissionBtn}
                    >
                      <Text style={styles.permissionBtnText}>Enable Camera</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.cameraFrameBox}>
                    <CameraView
                      style={StyleSheet.absoluteFill}
                      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                      onBarcodeScanned={({ data }) => handleBarCodeScanned(data)}
                    />
                    <View style={styles.scannerReticleWrap} pointerEvents="none">
                      <View style={styles.scannerReticleCorner} />
                      <Text style={styles.scannerHintText}>Point camera at Workplace QR</Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Tab 3: Paste Link / Token */}
            {anotherMethod === 'link' && (
              <View style={styles.tabContentWrap}>
                <Text style={styles.tabHelpText}>
                  Paste the full invite link or secure invite token provided by your admin
                </Text>
                <View style={styles.inputWithActionRow}>
                  <TextInput
                    style={styles.anotherInput}
                    placeholder={`${process.env.EXPO_PUBLIC_JOIN_BASE_URL || 'https://www.bizora.shivamshankhdhar.online/join'}/... or token`}
                    placeholderTextColor="#999"
                    value={inputLink}
                    onChangeText={setInputLink}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Pressable
                    accessibilityRole="button"
                    disabled={!inputLink.trim() || submittingAnother}
                    onPress={() => handleJoinAnother(inputLink)}
                    style={({ pressed }) => [
                      styles.anotherSubmitBtn,
                      (!inputLink.trim() || submittingAnother) && { opacity: 0.5 },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    {submittingAnother ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.anotherSubmitBtnText}>Join</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          {/* Cancel or switch back */}
          <Pressable
            onPress={() => setStep('welcome-chooser')}
            style={styles.cancelLink}
          >
            <Text style={styles.cancelLinkText}>Back to options</Text>
          </Pressable>
        </ScrollView>

        <View style={styles.bottomAdWrap}>
          <AdBanner position="bottom" />
        </View>
      </SafeAreaView>
    );
  }

  // ==========================================
  // SCREEN 6: This invite couldn't be used
  // ==========================================
  if (step === 'invite-invalid') {
    const signedInEmail = user?.email || '';

    return (
      <SafeAreaView style={styles.outerContainer} edges={['top', 'left', 'right', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.invitedContainer}
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {/* Document Graphic with cross badge & radiating rays */}
          <View style={styles.illustrationWrapper}>
            <InviteFailedIllustration size={130} />
          </View>

          {/* Heading */}
          <Text style={styles.screenTitle}>This invite couldn&apos;t be used</Text>
          <Text style={styles.screenSubtitle}>
            The invite link is expired or this Google account isn&apos;t the one that was invited.
          </Text>

          {/* Warning Card (Screen 6) */}
          <View style={styles.warningCard}>
            {/* Account Row */}
            <View style={styles.warningRow}>
              <View style={styles.warningIconTile}>
                <Feather name="user" size={19} color={Palette.brandPrimary} />
              </View>
              <View style={styles.warningTextCol}>
                <Text style={styles.warningLabel}>You&apos;re signed in as</Text>
                <Text style={styles.warningEmail}>{signedInEmail}</Text>
                <Text style={styles.warningNoticeRed}>
                  This account is not authorised for this invite.
                </Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            {/* Expired Link Row */}
            <View style={styles.warningRow}>
              <View style={styles.warningIconTile}>
                <Feather name="calendar" size={19} color={Palette.brandPrimary} />
              </View>
              <View style={styles.warningTextCol}>
                <Text style={styles.warningBoldTitle}>The invite link has expired</Text>
                <Text style={styles.warningSubText}>
                  Invite links are valid for a limited time for security.
                </Text>
              </View>
            </View>
          </View>

          {/* Buttons Block */}
          <View style={styles.bottomButtonsBlock}>
            {/* Switch Google Account */}
            <Pressable
              accessibilityRole="button"
              onPress={async () => {
                await logout();
              }}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.btnPressed,
              ]}
            >
              <Text style={styles.primaryBtnText}>Switch Google account</Text>
            </Pressable>

            {/* Ask employer for new link */}
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                showSuccess(
                  'Please contact your business manager to generate a new invitation link.',
                  'Request New Link'
                );
                setStep('welcome-chooser');
              }}
              style={({ pressed }) => [
                styles.outlineBtn,
                pressed && styles.outlineBtnPressed,
              ]}
            >
              <Text style={styles.outlineBtnText}>Ask workplace for new link</Text>
            </Pressable>
          </View>
        </ScrollView>

        <View style={styles.bottomAdWrap}>
          <AdBanner position="bottom" />
        </View>
      </SafeAreaView>
    );
  }

  // ==========================================
  // SCREEN 2: Action Chooser ("Welcome, Priya")
  // ==========================================
  //
  // If the user has a pending join request (and no invited membership), show
  // the pending-status full-screen view instead of the chooser cards.
  if (pendingJoinRequest && !invitedMembership) {
    return (
      <SafeAreaView style={styles.outerContainer} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.topBar}>
          {/* No back on pending-request screen – user is authenticated, nowhere logical to go back to */}
          <View style={{ width: 38 }} />
          <Pressable
            accessibilityRole="button"
            onPress={handleHelpPress}
            style={styles.helpLink}
          >
            <Text style={styles.helpText}>Help</Text>
            <Feather name="help-circle" size={17} color={Palette.brandPrimary} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[styles.chooserScrollContent, { alignItems: 'center' }]}
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {/* Pending state illustration */}
          <View style={[styles.illustrationWrapper, { marginTop: 16 }]}>
            <MaterialCommunityIcons name="clock-outline" size={80} color="#B9770E" />
          </View>

          <Text style={[styles.screenTitle, { textAlign: 'center' }]}>Request Pending</Text>
          <Text style={[styles.screenSubtitle, { textAlign: 'center', marginBottom: 24 }]}>
            Your request to join a workplace is being reviewed by the admin.
          </Text>

          <View style={[styles.pendingBannerCard, { width: '100%' }]}>
            <View style={styles.pendingBadgeRow}>
              <View style={styles.pendingPulseDot} />
              <Text style={styles.pendingBadgeText}>AWAITING APPROVAL</Text>
            </View>
            <Text style={styles.pendingWpName}>{pendingJoinRequest.workplaceName}</Text>
            {pendingJoinRequest.address ? (
              <Text style={[styles.pendingDesc, { marginBottom: 4 }]}>{pendingJoinRequest.address}</Text>
            ) : null}
            <Text style={styles.pendingDesc}>
              Your request was submitted and is awaiting employer approval. Check back later or refresh below.
            </Text>
            <View style={styles.pendingBtnRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Check status"
                disabled={checkingPendingStatus}
                onPress={handleCheckPendingStatus}
                style={({ pressed }) => [styles.checkStatusBtn, pressed && { opacity: 0.85 }]}
              >
                {checkingPendingStatus ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="refresh-cw" size={13} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.checkStatusBtnText}>Check Status</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel request"
                disabled={checkingPendingStatus}
                onPress={handleCancelPendingRequest}
                style={styles.cancelPendingBtn}
              >
                <Text style={styles.cancelPendingBtnText}>Cancel Request</Text>
              </Pressable>
            </View>
          </View>

          {/* Info note */}
          <View style={[styles.greenNoticeBox, { marginTop: 16 }]}>
            <MaterialCommunityIcons name="information-outline" size={18} color="#2E7D32" style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.greenNoticeTitle}>What happens next?</Text>
              <Text style={styles.greenNoticeText}>
                Once the workplace admin approves your request, the app will grant you access automatically.
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/my-join-requests')}
            style={{ paddingVertical: 14, alignSelf: 'center' }}
          >
            <Text style={{ color: Palette.brandPrimary, fontWeight: '600', fontSize: 14 }}>View all my join requests</Text>
          </Pressable>
        </ScrollView>

        <View style={styles.bottomAdWrap}>
          <AdBanner position="bottom" />
        </View>

        {renderHelpModal()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.outerContainer} edges={['top', 'left', 'right', 'bottom']}>
      {/* Top Bar: back button only if there's an active membership to go back to */}
      <View style={styles.topBar}>
        {memberships.some((m) => m.status === 'ACTIVE') ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to workplace"
            onPress={handleBackFromChooser}
            style={styles.iconBtn}
          >
            <Feather name="arrow-left" size={22} color="#17202A" />
          </Pressable>
        ) : (
          <View style={{ width: 38 }} />
        )}

        <Pressable
          accessibilityRole="button"
          onPress={handleHelpPress}
          style={styles.helpLink}
        >
          <Text style={styles.helpText}>Help</Text>
          <Feather name="help-circle" size={17} color={Palette.brandPrimary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.chooserScrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Heading */}
        <View style={styles.headerBlock}>
          <Text style={styles.screenTitle}>Welcome, {firstName}</Text>
          <Text style={styles.screenSubtitle}>What would you like to do?</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/my-join-requests')} style={{ paddingVertical: 14 }}><Text style={{ color: Palette.brandPrimary, fontWeight: '600' }}>My join requests</Text></Pressable>
        </View>

        {/* Options Cards */}
        <View style={styles.cardsContainer}>
          {/* Card 1: Create a workplace */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create a workplace"
            onPress={() => setStep('create-workplace')}
            style={({ pressed }) => [
              styles.optionCard,
              pressed && styles.cardPressed,
            ]}
          >
            <View style={styles.cardIconBox}>
              <MaterialCommunityIcons
                name="storefront-outline"
                size={26}
                color={Palette.brandPrimary}
              />
            </View>

            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Create a workplace</Text>
              <Text style={styles.cardSubtitle}>
                Set up your business, add your team and start tracking attendance.
              </Text>
            </View>

            <Feather name="chevron-right" size={20} color={Palette.brandPrimary} />
          </Pressable>

          {/* Card 2: Join a workplace */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Join a workplace"
            onPress={handleJoinWorkplacePress}
            style={({ pressed }) => [
              styles.optionCard,
              pressed && styles.cardPressed,
            ]}
          >
            <View style={styles.cardIconBox}>
              <MaterialCommunityIcons
                name="account-group-outline"
                size={26}
                color={Palette.brandPrimary}
              />
            </View>

            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Join a workplace</Text>
              <Text style={styles.cardSubtitle}>
                You&apos;ve been invited to join a workplace. Continue to get started.
              </Text>
            </View>

            <Feather name="chevron-right" size={20} color={Palette.brandPrimary} />
          </Pressable>
        </View>

        {/* Pink Bottom Callout Box (Screen 2) */}
        <View style={styles.preapprovedCallout}>
          <Feather name="mail" size={18} color={Palette.brandPrimary} style={styles.mailIcon} />
          <Text style={styles.preapprovedText}>
            Workplace admins review each join request before granting access.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.bottomAdWrap}>
        <AdBanner position="bottom" />
      </View>

      {/* QR & Code Workplace Join Modal */}
      <JoinWorkplaceModal
        visible={joinModalVisible}
        onClose={() => setJoinModalVisible(false)}
        onJoinedSuccess={(wpId) => {
          setJoinModalVisible(false);
        }}
      />

      {/* Manual Invite Claim Modal */}
      <Modal
        visible={inviteModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setInviteModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setInviteModalVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalDragHandle} />
            <Text style={styles.modalTitle}>Join with invite</Text>
            <Text style={styles.modalSubText}>
              Paste your workplace invite link or code below:
            </Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="Paste link or token"
                placeholderTextColor="#A89F9A"
                value={manualInviteCode}
                onChangeText={setManualInviteCode}
                autoCapitalize="none"
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <Pressable
                onPress={() => setInviteModalVisible(false)}
                style={[styles.outlineBtn, { flex: 1, height: 46 }]}
              >
                <Text style={styles.outlineBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleManualInviteClaim}
                disabled={!manualInviteCode.trim() || submitting}
                style={[styles.primaryBtn, { flex: 1, height: 46, marginTop: 0 }]}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Join</Text>
                )}
              </Pressable>
            </View>

            <AdBanner position="bottom" />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Help Modal */}
      {renderHelpModal()}
    </SafeAreaView>
  );

  function renderHelpModal() {
    return (
      <Modal
        visible={helpModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setHelpModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setHelpModalVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalDragHandle} />
            <View style={styles.helpHeaderRow}>
              <Feather name="help-circle" size={24} color={Palette.brandPrimary} />
              <Text style={styles.modalTitle}>Help & Getting Started</Text>
            </View>

            <View style={styles.helpBody}>
              <Text style={styles.helpSectionTitle}>Business Owners & Managers</Text>
              <Text style={styles.helpSectionText}>
                Choose &ldquo;Create a workplace&rdquo; to set up your business and generate the daily attendance QR code.
              </Text>

              <Text style={styles.helpSectionTitle}>Team Members & Employees</Text>
              <Text style={styles.helpSectionText}>
                If your workplace added your Google account, tap &ldquo;Join a workplace&rdquo;. You can also use your Employee ID &amp; PIN from the login screen.
              </Text>
            </View>

            <Pressable
              onPress={() => setHelpModalVisible(false)}
              style={[styles.primaryBtn, { height: 48, marginTop: 20 }]}
            >
              <Text style={styles.primaryBtnText}>Got it</Text>
            </Pressable>

            <AdBanner position="bottom" />
          </Pressable>
        </Pressable>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  iconBtn: {
    padding: 8,
  },
  helpLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
  },
  helpText: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.brandPrimary,
  },
  chooserScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
    justifyContent: 'space-between',
  },
  headerBlock: {
    marginBottom: 24,
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: Palette.brandPressed,
    letterSpacing: -0.8,
    textAlign: 'center',
    marginTop: 8,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#17202A',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  screenSubtitle: {
    fontSize: 14,
    color: '#686461',
    lineHeight: 20,
  },
  cardsContainer: {
    gap: 16,
    marginBottom: 28,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAE5E2',
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  cardPressed: {
    backgroundColor: '#FAF7F6',
  },
  cardIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Palette.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#17202A',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#686461',
    lineHeight: 18,
  },
  preapprovedCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Palette.brandTint,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginTop: 'auto',
  },
  mailIcon: {
    marginTop: 2,
  },
  preapprovedText: {
    flex: 1,
    fontSize: 13,
    color: Palette.brandPrimary,
    lineHeight: 19,
    fontWeight: '500',
  },

  // Form Styles (Screen 3)
  formScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 36,
  },
  formContainer: {
    width: '100%',
  },
  fieldGroup: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#17202A',
    fontWeight: '600',
    marginBottom: 8,
  },
  inputBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAE5E2',
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  bottomAdWrap: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  textAreaBox: {
    height: 100,
    paddingVertical: 12,
  },
  textInput: {
    fontSize: 15,
    color: '#17202A',
    fontWeight: '500',
  },
  textAreaInput: {
    height: '100%',
  },
  primaryBtn: {
    width: '100%',
    height: 52,
    backgroundColor: Palette.brandPrimary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  btnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  outlineBtn: {
    width: '100%',
    height: 52,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Palette.brandPrimary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: {
    color: Palette.brandPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  outlineBtnPressed: {
    backgroundColor: Palette.brandTint,
  },

  // Invited Screen Styles (Screen 4 & 6)
  invitedContainer: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 32,
    alignItems: 'center',
  },
  illustrationWrapper: {
    marginVertical: 16,
    alignItems: 'center',
  },
  infoCard: {
    width: '100%',
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  infoIconTile: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Palette.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#8A8582',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#17202A',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F0E6E6',
  },
  codeRowWithCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  codeMonoValue: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: Palette.brandPrimary,
    letterSpacing: 1.5,
  },
  copyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5EE',
    borderWidth: 1,
    borderColor: '#E2E2D6',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 4,
  },
  copyChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.brandPrimary,
  },
  greenNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F0F9F1',
    borderWidth: 1,
    borderColor: '#C3E6CB',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    marginBottom: 20,
  },
  greenNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#27AE60',
    marginBottom: 2,
  },
  greenNoticeText: {
    fontSize: 12,
    color: '#2E7D32',
    lineHeight: 17,
  },
  pinkNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FDF1F1',
    borderWidth: 1,
    borderColor: '#FAD5D8',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    marginBottom: 24,
  },
  pinkNoticeText: {
    flex: 1,
    fontSize: 12.5,
    color: Palette.brandPrimary,
    lineHeight: 18,
    fontWeight: '500',
  },
  joinAnotherCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EBEBE6',
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  joinAnotherHeader: {
    marginBottom: 12,
  },
  joinAnotherTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.textPrimary,
    letterSpacing: -0.2,
  },
  joinAnotherSubtitle: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  joinTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
    gap: 4,
  },
  joinTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    gap: 4,
  },
  joinTabBtnActive: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  joinTabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textSecondary,
    flexShrink: 1,
  },
  joinTabBtnTextActive: {
    color: Palette.brandPrimary,
    fontWeight: '700',
  },
  tabContentWrap: {
    marginTop: 2,
  },
  tabHelpText: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginBottom: 10,
    lineHeight: 17,
  },
  inputWithActionRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  anotherInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Palette.textPrimary,
    backgroundColor: '#FAFAF8',
  },
  anotherSubmitBtn: {
    backgroundColor: Palette.brandPrimary,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anotherSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  qrPermissionBox: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#FAFAF8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEFEA',
  },
  qrPermissionText: {
    fontSize: 12,
    color: Palette.textSecondary,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 17,
  },
  permissionBtn: {
    backgroundColor: Palette.brandPrimary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  permissionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cameraFrameBox: {
    height: 190,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000000',
    position: 'relative',
  },
  scannerReticleWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  scannerReticleCorner: {
    width: 120,
    height: 120,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 10,
  },
  scannerHintText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  cancelLink: {
    marginTop: 18,
    padding: 8,
  },
  cancelLinkText: {
    fontSize: 14,
    color: '#686461',
    fontWeight: '600',
  },

  // Invalid / Expired Screen (Screen 6)
  warningCard: {
    width: '100%',
    backgroundColor: '#FDF1F1',
    borderWidth: 1,
    borderColor: '#FAD5D8',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 24,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
  },
  warningIconTile: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  warningTextCol: {
    flex: 1,
  },
  warningLabel: {
    fontSize: 12,
    color: '#686461',
    marginBottom: 2,
  },
  warningEmail: {
    fontSize: 15,
    fontWeight: '700',
    color: '#17202A',
    marginBottom: 2,
  },
  warningNoticeRed: {
    fontSize: 12.5,
    color: '#B83B4A',
    fontWeight: '500',
  },
  warningBoldTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#17202A',
    marginBottom: 2,
  },
  warningSubText: {
    fontSize: 12.5,
    color: '#686461',
    lineHeight: 17,
  },
  bottomButtonsBlock: {
    width: '100%',
    gap: 12,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 20,
  },
  modalDragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#17202A',
    marginBottom: 6,
  },
  modalSubText: {
    fontSize: 13,
    color: '#686461',
    marginBottom: 16,
    lineHeight: 18,
  },
  helpHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  helpBody: {
    gap: 10,
  },
  helpSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#17202A',
    marginTop: 6,
  },
  helpSectionText: {
    fontSize: 13,
    color: '#686461',
    lineHeight: 19,
  },
  pendingBannerCard: {
    backgroundColor: '#FEF9E7',
    borderWidth: 1,
    borderColor: '#F9E79F',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#B9770E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  pendingBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pendingPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#B9770E',
    marginRight: 6,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B9770E',
    letterSpacing: 0.5,
  },
  pendingWpName: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.textPrimary,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  pendingDesc: {
    fontSize: 13,
    color: Palette.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  pendingBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  checkStatusBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B9770E',
    paddingVertical: 10,
    borderRadius: 10,
  },
  checkStatusBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelPendingBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0D0A5',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderRadius: 10,
  },
  cancelPendingBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
});
