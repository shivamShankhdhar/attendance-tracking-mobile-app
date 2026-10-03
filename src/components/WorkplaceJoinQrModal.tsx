import { copyToClipboard } from '../utils/clipboard';
import { getWorkplaceLink } from '../services/workplaceLinks';
import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Share,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Feather } from '@expo/vector-icons';
import { Palette } from '../constants/colors';
import { SkeletonBox } from './SkeletonScreens';
import { ConfirmDialog } from './ConfirmDialog';
import { getSessionVersion } from '../services/api';
import { attendanceApi } from '../services/attendanceApi';
import { showError, showSuccess } from '../stores/alertStore';
import { EnvelopePersonPlusIllustration } from './illustrations/IllustrationAssets';
import { AdBanner } from './AdBanner';

interface WorkplaceJoinQrModalProps {
  visible: boolean;
  embedded?: boolean;
  workplaceId: string;
  workplaceName: string;
  onClose: () => void;
  onViewRequests?: () => void;
}

export function WorkplaceJoinQrModal({
  visible,
  embedded = false,
  workplaceId,
  workplaceName,
  onClose,
  onViewRequests,
}: WorkplaceJoinQrModalProps) {
  const [rotating, setRotating] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const userId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();
  const [requestedFor, setRequestedFor] = useState<string | null>(null);

  const safeUseRef = (React as any).useRef || ((init: any) => ({ current: init }));
  const safeUseEffect = (React as any).useEffect || ((_fn: any) => {});

  const [mounted, setMounted] = useState(visible);
  const slideAnim = safeUseRef(Animated?.Value ? new Animated.Value(600) : { current: 0 }).current;
  const overlayOpacity = safeUseRef(Animated?.Value ? new Animated.Value(0) : { current: 1 }).current;

  safeUseEffect(() => {
    if (visible) {
      setMounted(true);
      if (Animated?.parallel) {
        Animated.parallel([
          Animated.timing(overlayOpacity as any, {
            toValue: 1,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.spring(slideAnim as any, {
            toValue: 0,
            damping: 28,
            mass: 0.8,
            stiffness: 240,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } else {
      if (Animated?.parallel) {
        Animated.parallel([
          Animated.timing(overlayOpacity as any, {
            toValue: 0,
            duration: 120,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim as any, {
            toValue: 600,
            duration: 180,
            useNativeDriver: true,
          }),
        ]).start(({ finished }) => {
          if (finished) setMounted(false);
        });
      } else {
        setMounted(false);
      }
    }
  }, [visible]);

  const handleDismiss = () => {
    if (Animated?.parallel) {
      Animated.parallel([
        Animated.timing(overlayOpacity as any, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim as any, {
          toValue: 600,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setMounted(false);
          onClose();
        }
      });
    } else {
      onClose();
    }
  };

  const invitationIdentity = `${userId || ''}:${workplaceId}`;
  const hasRequested = requestedFor === invitationIdentity;
  const [qrRequestedFor, setQrRequestedFor] = useState<string | null>(null);
  const showQr = qrRequestedFor === invitationIdentity;
  const queryKey = ['workplace-join-qr', userId, workplaceId];
  const { data: qrData, error, isFetching: loading, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await attendanceApi.getJoinQr(workplaceId);
      if (!res?.qrPayload) throw new Error('Server returned empty QR payload');
      return res;
    },
    enabled: hasRequested && visible && Boolean(workplaceId && userId),
    staleTime: 60_000,
  });
  const linkMutation = useMutation({
    mutationFn: async () => {
      const version = getSessionVersion();
      const result = await attendanceApi.createInviteLink(workplaceId);
      if (!result.joinLink && !result.qrToken) throw new Error('The invitation link was not returned. Please try again.');
      return { result, version };
    },
    onSuccess: ({ result, version }) => {
      if (version !== getSessionVersion()) return;
      queryClient.setQueryData(queryKey, result);
      setRequestedFor(invitationIdentity);
    },
  });
  const fetchError = error?.message;
  const inviteReady = hasRequested && Boolean(qrData?.qrPayload) && !rotating;
  const linkReady = hasRequested && Boolean(qrData?.joinLink || qrData?.qrToken || qrData?.qrPayload?.startsWith('http')) && !rotating;
  const workplaceCode = qrData?.qrToken || (workplaceId ? workplaceId.slice(-6).toUpperCase() : '');

  const resolveJoinUrl = () => {
    if (qrData?.joinLink) return qrData.joinLink;
    if (qrData?.qrToken) return getWorkplaceLink(qrData.qrToken);
    if (qrData?.qrPayload && typeof qrData.qrPayload === 'string' && qrData.qrPayload.startsWith('http')) {
      return qrData.qrPayload;
    }
    return '';
  };

  const handleCopyCode = async () => {
    if (!workplaceCode || rotating) return;
    try {
      const copied = await copyToClipboard(workplaceCode);
      if (copied) {
        showSuccess('Workplace code copied.');
        return;
      }
      await Share.share({
        message: `${workplaceName || 'Workplace'} code: ${workplaceCode}`,
      });
    } catch {
      showError('Unable to copy the workplace code.');
    }
  };

  const handleShare = async () => {
    if (rotating) return;
    const joinUrl = resolveJoinUrl();
    if (!joinUrl) {
      showError('Workplace invite link is not ready yet. Please wait a moment.');
      return;
    }
    try {
      const name = workplaceName || 'Workplace';
      const msg = `Join our workplace "${name}" on Bizora!\n\n${joinUrl}\n\nSign in, review the workplace details and tap Request to join. Your admin will review your request.`;
      await Share.share({
        title: `Join ${name}`,
        message: msg,
      });
    } catch {
      showError('Unable to share the invitation. Please try again.');
    }
  };

  const handleCopyLink = async () => {
    if (rotating) return;
    const joinUrl = resolveJoinUrl();
    if (!joinUrl) {
      showError('Workplace invite link is not ready yet. Please wait a moment.');
      return;
    }
    try {
      const copied = await copyToClipboard(joinUrl);
      if (copied) {
        showSuccess('Workplace invite link copied.');
        return;
      }
      // If native clipboard module is unlinked in current dev build, fall back to native Share dialog
      // which has a built-in "Copy" button on both iOS and Android
      await Share.share({
        title: `Join ${workplaceName || 'Workplace'}`,
        message: joinUrl,
      });
    } catch {
      showError('Unable to copy the invitation.');
    }
  };

  const handleRotate = async () => {
    if (rotating) return;
    try {
      setRotating(true);
      const res = await attendanceApi.rotateJoinQr(workplaceId);
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData(queryKey, res);
      setConfirmRotate(false);
      showSuccess('Workplace QR code updated successfully');
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Failed to regenerate QR code');
    } finally { setRotating(false); }
  };

  const handleInviteViaLink = () => {
    setQrRequestedFor(null);
    return linkMutation.mutate();
  };

  const handleGenerateQr = () => {
    setRequestedFor(invitationIdentity);
    setQrRequestedFor(invitationIdentity);
    if (!qrData) {
      void refetch();
    }
  };

  const handleResetToOptions = () => {
    setRequestedFor(null);
    setQrRequestedFor(null);
  };

  const content = <View style={[styles.sheetContainer, embedded && styles.embedded]}>
    {!embedded && <View style={styles.modalHeader}><Text style={styles.modalTitle}>Invite your team</Text><Pressable accessibilityRole="button" accessibilityLabel="Close invitation" onPress={handleDismiss} style={styles.iconButton}><Feather name="x" size={20} color={Palette.textSecondary} /></Pressable></View>}
    <View style={[styles.intro, embedded && styles.embeddedIntro]}>
      {embedded && <View style={styles.introIcon}><Feather name="user-plus" size={20} color={Palette.brandPrimary} /></View>}
      <View style={embedded && styles.flex}>
        <Text accessibilityRole="header" style={styles.title}>{embedded ? 'Invite your team' : 'Grow your team'}</Text>
        <Text style={styles.subtitle}>{embedded ? `Invite people to ${workplaceName || 'your workplace'} with a link or QR code. You review each request before they join.` : 'Choose how you’d like to invite members. You review each request before they join.'}</Text>
      </View>
    </View>
    
    {!hasRequested ? (
      <View style={styles.startingContainer}>
        {!embedded && <View style={{ alignItems: 'center', marginBottom: 4 }}><EnvelopePersonPlusIllustration size={105} /></View>}
        {linkMutation.error && <View style={styles.errorRow}><Text accessibilityRole="alert" style={styles.error}>{linkMutation.error.message}</Text></View>}
        <OptionCard
          label="Invite via link"
          title="Invite via link"
          description="Share a direct joining link via WhatsApp, SMS, or email."
          badge="Quickest"
          icon="link-2"
          isLoading={linkMutation.isPending}
          disabled={!userId || !workplaceId || linkMutation.isPending}
          onPress={handleInviteViaLink}
        />
        <OptionCard
          label="Generate invite QR"
          title="Generate QR code"
          description="Display a scannable QR code on screen or print it for in-person joining."
          icon="grid"
          disabled={!userId || !workplaceId || linkMutation.isPending}
          onPress={handleGenerateQr}
        />
      </View>
    ) : (
      <View style={styles.qrCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={styles.iconTile}><Feather name="user-plus" size={17} color={Palette.brandPrimary} /></View>
            <View style={styles.flex}>
              <Text style={styles.cardTitle} numberOfLines={2}>{workplaceName || 'Workplace'}</Text>
              <Text style={styles.cardSubtitle}>Direct invitation</Text>
            </View>
          </View>
          <View style={styles.approvalBadge}>
            <Feather name="shield" size={11} color={Palette.brandPrimary} />
            <Text style={styles.badgeText}>Approval required</Text>
          </View>
        </View>

        {/* Mode switcher tabs */}
        <View style={styles.modeSelector}>
          <Pressable
            accessibilityRole="tab"
            accessibilityLabel="Invite via link"
            onPress={() => {
              setQrRequestedFor(null);
              if (!qrData?.joinLink && !qrData?.qrToken) {
                linkMutation.mutate();
              }
            }}
            style={[styles.modeTab, !showQr && styles.modeTabActive]}
          >
            <Feather name="link-2" size={14} color={!showQr ? Palette.brandPrimary : Palette.textSecondary} />
            <Text style={[styles.modeTabText, !showQr && styles.modeTabTextActive]}>Invite link</Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityLabel="QR Code"
            onPress={() => setQrRequestedFor(invitationIdentity)}
            style={[styles.modeTab, showQr && styles.modeTabActive]}
          >
            <Feather name="grid" size={14} color={showQr ? Palette.brandPrimary : Palette.textSecondary} />
            <Text style={[styles.modeTabText, showQr && styles.modeTabTextActive]}>QR Code</Text>
          </Pressable>
        </View>

        {showQr ? (
          <View style={styles.qrArea}>
            {loading && !qrData ? (
              <View accessibilityLabel="Loading invitation QR" style={styles.qrFrame}>
                <SkeletonBox width={176} height={176} borderRadius={8} />
              </View>
            ) : qrData?.qrPayload ? (
              <View style={[styles.qrFrame, rotating && styles.disabled, { backgroundColor: '#FFFFFF' }]}>
                <QRCode
                  value={qrData.qrPayload}
                  size={176}
                  color="#000000"
                  backgroundColor="#FFFFFF"
                />
              </View>
            ) : (
              <View style={styles.empty}>
                <Feather name="wifi-off" size={28} color={Palette.textSecondary} />
                <Text style={styles.cardTitle}>Invitation couldn’t load</Text>
                <Text style={styles.caption}>{fetchError || 'Check your connection and try again.'}</Text>
                <InviteButton label="Try again" icon="refresh-cw" onPress={() => void refetch()} secondary />
              </View>
            )}
            {workplaceCode && (
              <Pressable accessibilityRole="button" accessibilityLabel={`Copy workplace code ${workplaceCode}`} disabled={!inviteReady} onPress={() => void handleCopyCode()} style={styles.codeRow}>
                <Text style={styles.codeLabel}>Workplace code</Text>
                <Text selectable style={styles.code}>{workplaceCode}</Text>
                <Feather name="copy" size={14} color={Palette.brandPrimary} />
              </Pressable>
            )}
          </View>
        ) : (
          <View style={styles.linkSection}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Copy invitation link"
              onPress={() => void handleCopyLink()}
              style={({ pressed }) => [styles.linkBox, pressed && styles.linkBoxPressed]}
            >
              <View style={styles.linkBoxLeft}>
                <Feather name="link-2" size={15} color={Palette.brandPrimary} />
                <Text numberOfLines={1} style={styles.linkUrlClean}>
                  {resolveJoinUrl() ? resolveJoinUrl().replace(/^https?:\/\//, '') : 'Preparing invitation link…'}
                </Text>
              </View>
              <View style={styles.copyPill}>
                <Feather name="copy" size={12} color={Palette.brandPrimary} />
                <Text style={styles.copyPillText}>Copy</Text>
              </View>
            </Pressable>
            <Text style={styles.linkHelpText}>
              Anyone with this link can request to join. You review and approve each request.
            </Text>
          </View>
        )}

        {fetchError && qrData && (
          <Pressable accessibilityRole="button" onPress={() => void refetch()} style={styles.errorRow}>
            <Text style={styles.error}>Couldn’t refresh the invitation. Tap to retry.</Text>
          </Pressable>
        )}

        <View style={styles.actions}>
          <InviteButton label="Share invite" icon="share-2" onPress={() => void handleShare()} disabled={!linkReady} />
          <InviteButton label="Copy link" icon="copy" onPress={() => void handleCopyLink()} disabled={!linkReady} secondary />
        </View>
        {!showQr && (
          <AltSwitchLink
            label="Show invite QR"
            disabled={rotating || !qrData?.qrPayload}
            onPress={() => setQrRequestedFor(invitationIdentity)}
          />
        )}
      </View>
    )}

    {hasRequested && (
      <View style={styles.guide}>
        <Text style={styles.guideTitle}>How joining works</Text>
        <Step number="1" title="Share" description="Send the link or let your team scan the QR." />
        <Step number="2" title="Request" description="They sign in and request access." />
        <Step number="3" title="Approve" description="Review their request in the Access tab." />
        {onViewRequests && (
          <Pressable accessibilityRole="button" onPress={onViewRequests} style={styles.reviewLink}>
            <Text style={styles.reviewText}>Review join requests</Text>
            <Feather name="arrow-right" size={17} color={Palette.brandPrimary} />
          </Pressable>
        )}
      </View>
    )}

    {hasRequested && (
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: showOptions }} onPress={() => setShowOptions(value => !value)} style={styles.optionsToggle}>
        <Feather name="sliders" size={16} color={Palette.textSecondary} />
        <Text style={styles.optionsLabel}>Invitation options</Text>
        <Feather name={showOptions ? 'chevron-up' : 'chevron-down'} size={17} color={Palette.textSecondary} />
      </Pressable>
    )}
    {hasRequested && showOptions && (
      <View style={styles.options}>
        <Text style={styles.caption}>Replace this invitation if an old link or printed QR should stop working. Existing members keep their access.</Text>
        <InviteButton label={rotating ? 'Updating…' : 'Regenerate invitation'} icon="refresh-cw" disabled={rotating || loading || !qrData} onPress={() => setConfirmRotate(true)} secondary />
      </View>
    )}
    <ConfirmDialog visible={confirmRotate} title="Regenerate invitation?" message="Previously shared invite links and QR codes will stop working. Existing team members keep their access." confirmLabel="Regenerate" isDestructive loading={rotating} onConfirm={() => void handleRotate()} onCancel={() => { if (!rotating) setConfirmRotate(false); }} />
  </View>;
  if (embedded) return content;
  if (!mounted) return null;
  const AnimatedView = (Animated && Animated.View) ? Animated.View : View;

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={handleDismiss}>
      <View style={styles.backdrop}>
        {/* Fast static overlay that does not slide */}
        <AnimatedView style={[StyleSheet.absoluteFill, styles.backdropOverlay, { opacity: overlayOpacity as any }]}>
          <Pressable style={styles.dismissArea} onPress={handleDismiss} />
        </AnimatedView>

        {/* Modal scroll sheet that slides from bottom to top */}
        <AnimatedView style={[styles.modalCardWrapper, { transform: [{ translateY: slideAnim as any }] }]}>
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {content}
          </ScrollView>
          <AdBanner position="bottom" safeBottom />
        </AnimatedView>
      </View>
    </Modal>
  );
}

function OptionCard({
  label,
  title,
  description,
  badge,
  icon,
  isLoading = false,
  disabled = false,
  onPress,
}: {
  label: string;
  title: string;
  description: string;
  badge?: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  isLoading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionCard,
        pressed && styles.optionCardPressed,
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.optionIconTile}>
        {isLoading ? (
          <ActivityIndicator size="small" color={Palette.brandPrimary} />
        ) : (
          <Feather name={icon} size={22} color={Palette.brandPrimary} />
        )}
      </View>
      <View style={styles.optionContent}>
        <View style={styles.optionHeaderRow}>
          <Text style={styles.optionTitle}>{title}</Text>
          {badge && (
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedText}>{badge}</Text>
            </View>
          )}
        </View>
        <Text style={styles.optionDescription}>{description}</Text>
      </View>
      <Feather name="chevron-right" size={20} color={Palette.textSecondary} />
    </Pressable>
  );
}

function InviteButton({ label, icon, onPress, secondary = false, disabled = false }: { label: string; icon: React.ComponentProps<typeof Feather>['name']; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.secondaryButton, (pressed || disabled) && styles.disabled]}><Feather name={icon} size={17} color={secondary ? Palette.brandPrimary : Palette.textInverse} /><Text style={[styles.buttonText, secondary && styles.secondaryText]}>{label}</Text></Pressable>;
}
function AltSwitchLink({ label, disabled = false, onPress }: { label: string; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.altSwitchRow, pressed && { opacity: 0.7 }, disabled && styles.disabled]}
    >
      <Feather name="grid" size={13} color={Palette.brandPrimary} />
      <Text style={styles.altSwitchText}>Need to scan in person?</Text>
      <Text style={styles.altSwitchAction}>Show QR</Text>
    </Pressable>
  );
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return <View style={styles.step}><View style={styles.stepNumber}><Text style={styles.stepNumberText}>{number}</Text></View><View style={styles.flex}><Text style={styles.stepTitle}>{title}</Text><Text style={styles.caption}>{description}</Text></View></View>;
}
const styles = StyleSheet.create({
  generateIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: Palette.brandTint, justifyContent: 'center', alignItems: 'center' },
  embedded: { padding: 0, paddingBottom: 8, borderRadius: 0 },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  backdropOverlay: { backgroundColor: 'rgba(23,32,42,0.65)' },
  modalCardWrapper: { width: '100%', maxHeight: '88%' },
  dismissArea: { flex: 1, minHeight: 32 },
  modalScroll: { flexGrow: 0, flexShrink: 1, backgroundColor: Palette.canvas, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetContainer: { padding: 20, paddingBottom: 32, backgroundColor: Palette.canvas, gap: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '600', color: Palette.textPrimary },
  iconButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: Palette.surface, borderRadius: 14 },
  intro: { gap: 6 },
  embeddedIntro: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface },
  introIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: Palette.brandTint, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 23, fontWeight: '700', color: Palette.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, lineHeight: 20, color: Palette.textSecondary },
  flex: { flex: 1, minWidth: 0 },
  
  /* Starting Options Styles */
  startingContainer: { gap: 12 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 17,
    minHeight: 92,
    borderRadius: 18,
    backgroundColor: Palette.surface,
    borderWidth: 1.5,
    borderColor: Palette.border,
    gap: 14,
    shadowColor: '#1B2210',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  optionCardPressed: {
    borderColor: Palette.brandPrimary,
    backgroundColor: Palette.brandTint,
  },
  optionIconTile: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Palette.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionContent: { flex: 1, gap: 4 },
  optionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionTitle: { fontSize: 16, fontWeight: '700', color: Palette.textPrimary },
  recommendedBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  recommendedText: { fontSize: 10, fontWeight: '700', color: '#166534' },
  optionDescription: { fontSize: 12, lineHeight: 18, color: Palette.textSecondary },

  /* Active QR / Invitation Card Styles */
  qrCard: { backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, borderRadius: 20, padding: 18, gap: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  iconTile: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.brandTint, borderRadius: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Palette.textPrimary },
  cardSubtitle: { fontSize: 12, color: Palette.textSecondary, marginTop: 1 },
  caption: { fontSize: 12, lineHeight: 18, color: Palette.textSecondary },
  approvalBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Palette.brandTint, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  badgeText: { color: Palette.brandPrimary, fontSize: 11, fontWeight: '600' },
  
  /* Mode Selector Tabs */
  modeSelector: { flexDirection: 'row', backgroundColor: Palette.surfaceMuted, borderRadius: 12, padding: 4, gap: 4, overflow: 'hidden' },
  modeTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 9, overflow: 'hidden' },
  modeTabActive: { backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, borderRadius: 9, overflow: 'hidden' },
  modeTabText: { fontSize: 12, fontWeight: '600', color: Palette.textSecondary },
  modeTabTextActive: { color: Palette.brandPrimary, fontWeight: '700' },

  /* Link Section */
  linkSection: { gap: 10 },
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.surfaceMuted,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  linkBoxPressed: { opacity: 0.8 },
  linkBoxLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  linkUrlClean: { fontSize: 13, fontWeight: '500', color: Palette.textPrimary, flex: 1 },
  copyPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Palette.brandTint, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  copyPillText: { fontSize: 11, fontWeight: '700', color: Palette.brandPrimary },
  linkHelpText: { fontSize: 12, lineHeight: 18, color: Palette.textSecondary },

  /* Alternate QR Switch row */
  altSwitchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 4 },
  altSwitchText: { fontSize: 12, color: Palette.textSecondary },
  altSwitchAction: { fontSize: 12, fontWeight: '700', color: Palette.brandPrimary },

  /* QR Area */
  qrArea: { alignItems: 'center', paddingTop: 4, gap: 12 },
  qrFrame: { padding: 16, borderWidth: 1, borderColor: Palette.border, borderRadius: 18, backgroundColor: Palette.surface },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 20 },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 40, backgroundColor: Palette.surfaceMuted, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  codeLabel: { fontSize: 12, color: Palette.textSecondary },
  code: { fontSize: 14, fontWeight: '700', letterSpacing: 1.2, color: Palette.brandPrimary },
  actions: { flexDirection: 'row', gap: 10 },
  button: { flex: 1, minHeight: 46, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, backgroundColor: Palette.brandPrimary },
  buttonText: { color: Palette.textInverse, fontSize: 13, fontWeight: '600', flexShrink: 1 },
  secondaryButton: { backgroundColor: Palette.brandTint },
  secondaryText: { color: Palette.brandPrimary },
  disabled: { opacity: 0.55 },
  cardFootnote: { fontSize: 11, color: Palette.textSecondary, textAlign: 'center', lineHeight: 17 },
  guide: { gap: 12, paddingHorizontal: 4 },
  guideTitle: { fontSize: 15, fontWeight: '600', color: Palette.textPrimary },
  step: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepNumber: { width: 27, height: 27, borderRadius: 9, backgroundColor: Palette.brandTint, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { color: Palette.brandPrimary, fontSize: 12, fontWeight: '600' },
  stepTitle: { fontSize: 12, color: Palette.textPrimary, fontWeight: '600', marginBottom: 2 },
  reviewLink: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewText: { fontSize: 13, color: Palette.brandPrimary, fontWeight: '600' },
  optionsToggle: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 44, borderTopWidth: 1, borderTopColor: Palette.border, paddingTop: 8 },
  optionsLabel: { flex: 1, fontSize: 12, color: Palette.textSecondary },
  options: { gap: 12 },
  errorRow: { padding: 10, backgroundColor: Palette.dangerTint, borderRadius: 10 },
  error: { color: Palette.danger, fontSize: 12, lineHeight: 18 },
});
