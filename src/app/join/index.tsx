import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useIsFocused } from 'expo-router/react-navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { DetailPage } from '../../components/DetailPage';
import { JoinStatusTracker } from '../../components/JoinStatusTracker';
import { WorkplaceInstallLanding } from '../../components/WorkplaceInstallLanding';
import { useAuthStore } from '../../stores/authStore';
import { attendanceApi } from '../../services/attendanceApi';
import { clearPendingJoin, getPendingJoin, parseWorkplaceInvite, savePendingJoin, saveTrackedJoin } from '../../services/workplaceLinks';
import { openJoinedWorkplace } from '../../services/joinNavigation';
import { Palette } from '../../constants/colors';
import { useForeground } from '../../hooks/use-foreground';
import {
  StoreEnvelopeIllustration,
  OfficeDoorwayIllustration,
  ExpiredInviteDocIllustration,
  IdBadgeLockIllustration,
  DocCheckmarkIllustration,
} from '../../components/illustrations/IllustrationAssets';

export default function JoinWorkplaceRoute() {
  const params = useLocalSearchParams<{ token?: string; requestId?: string; code?: string; invite?: string }>();
  const router = useRouter();
  const client = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const authenticated = useAuthStore((s) => s.isAuthenticated);
  const memberships = useAuthStore((s) => s.memberships);
  const isEmployer = memberships.some((m) => m.role === 'EMPLOYER');
  const [continueInBrowser, setContinueInBrowser] = useState(false);
  const [note, setNote] = useState('');
  const [manual, setManual] = useState('');
  const focused = useIsFocused();
  const foreground = useForeground();
  const rawParamToken = typeof params.token === 'string' && params.token ? params.token : typeof params.code === 'string' && params.code ? params.code : typeof params.invite === 'string' && params.invite ? params.invite : '';
  const requestId = typeof params.requestId === 'string' ? params.requestId : '';
  const tokenQuery = useQuery({ queryKey: ['join-route-token', rawParamToken, requestId], queryFn: async () => {
    if (requestId) return null;
    let token = rawParamToken;
    if (!token && Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const search = new URLSearchParams(window.location.search);
        token = search.get('token') || search.get('code') || search.get('invite') || '';
        if (!token) {
          const pathMatch = window.location.pathname.match(/\/join\/([^/?#]+)/);
          if (pathMatch) token = decodeURIComponent(pathMatch[1]);
        }
      } catch { /* ignore web location error */ }
    }
    if (!token) {
      token = (await getPendingJoin()) || '';
    }
    if (token) { await savePendingJoin(token); client.setQueryData(['pending-join'], token); }
    return token;
  }, staleTime: Infinity });
  const token = tokenQuery.data;
  const showLanding = Platform.OS === 'web' && Boolean(token) && !continueInBrowser;
  useEffect(() => {
    if (tokenQuery.isSuccess && !authenticated && !showLanding) router.replace('/');
  }, [authenticated, showLanding, tokenQuery.isSuccess, router]);
  const queryKey = requestId ? ['my-join-request', user?.id, requestId] : ['join-preview', user?.id, token];
  const preview = useQuery({ queryKey, queryFn: () => requestId ? attendanceApi.getMyJoinRequest(requestId) : attendanceApi.previewJoin(token!),
    enabled: authenticated && Boolean(token || requestId) && !showLanding && focused && foreground,
    refetchOnMount: 'always', staleTime: 0,
    refetchInterval: (query) => query.state.data?.latestRequest?.status === 'PENDING' ? 5000 : false,
  });
  const data = preview.data;
  const request = data?.latestRequest || data?.pendingRequest;
  const open = useMutation({ mutationFn: () => openJoinedWorkplace(user!.id, data!.workplaceId, request?.id, token || undefined), onSuccess: () => router.replace('/') });
  const attempted = useRef('');
  useEffect(() => {
    if (data?.alreadyMember && request?.status === 'APPROVED' && attempted.current !== request.id && user) {
      attempted.current = request.id;
      open.mutate();
    }
  }, [data?.alreadyMember, request?.id, request?.status, user, open]);

  useEffect(() => {
    if (authenticated && (isEmployer || data?.isOwner || data?.isEmployer || (data?.alreadyMember && !request))) {
      void clearPendingJoin().then(() => {
        client.setQueryData(['pending-join'], null);
        router.replace('/');
      });
    }
  }, [authenticated, isEmployer, data?.isOwner, data?.isEmployer, data?.alreadyMember, request, client, router]);
  const submit = useMutation({
    mutationFn: async () => {
      const result = await attendanceApi.submitJoinRequest(token!, note.trim());
      const tracking = { requestId: result.requestId, token: token! };
      await saveTrackedJoin(user!.id, tracking);
      client.setQueryData(['tracked-join', user!.id], tracking);
      return result;
    },
    onSuccess: async (result) => {
      if (result?.status === 'APPROVED' || result?.alreadyMember) {
        await useAuthStore.getState().refreshProfile();
        await openJoinedWorkplace(user!.id, data!.workplaceId, undefined, token || undefined);
        router.replace('/');
        return;
      }
      await Promise.all([client.invalidateQueries({ queryKey }), client.invalidateQueries({ queryKey: ['my-join-requests', user?.id] })]);
    },
  });
  if (showLanding && token) return <WorkplaceInstallLanding token={token} onContinue={() => setContinueInBrowser(true)} />;
  const error = tokenQuery.error || preview.error || submit.error || open.error;

  return (
    <DetailPage
      title="Workplace invitation"
      onBack={() => {
        void clearPendingJoin().then(() => {
          client.setQueryData(['pending-join'], null);
          router.replace('/');
        });
      }}
    >
      {(tokenQuery.isPending || (preview.isPending && Boolean(token || requestId)) || !authenticated) ? (
        <ActivityIndicator color={Palette.brandPrimary} style={{ marginVertical: 20 }} />
      ) : null}

      {/* Error / Expired state */}
      {error ? (
        <View style={styles.card}>
          <View style={styles.artworkStage}>
            <View style={styles.ambientCircleCoral} />
            <ExpiredInviteDocIllustration size={130} />
          </View>
          <Text style={styles.title}>Invalid or expired link</Text>
          <Text style={[styles.body, { textAlign: 'center' }]}>
            {error.message || 'This workplace invitation is no longer valid. Ask your admin for a fresh invitation code.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void tokenQuery.refetch();
              void preview.refetch();
            }}
            style={styles.primary}
          >
            <Text style={styles.primaryText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Loaded Workplace Details */}
      {data ? (
        <>
          <View style={styles.heroCard}>
            {/* Ambient Artwork Stage */}
            <View style={styles.artworkStage}>
              <View style={styles.ambientCircle} />
              <StoreEnvelopeIllustration size={135} />
            </View>

            {/* Verified Badge Pill */}
            <View style={styles.badgePill}>
              <View style={styles.pulseDot} />
              <Text style={styles.badgeText}>Workplace Invitation</Text>
            </View>

            <Text style={styles.workplaceName}>{data.workplaceName}</Text>
            {data.description ? (
              <Text style={styles.workplaceDescription}>{data.description}</Text>
            ) : (
              <Text style={styles.workplaceDescription}>
                You have been invited by {data.ownerName} to join this team.
              </Text>
            )}

            {/* Structured Meta Chips Grid */}
            <View style={styles.chipsContainer}>
              <View style={styles.metaChip}>
                <View style={styles.chipIconBox}>
                  <Feather name="shield" size={15} color={Palette.brandPrimary} />
                </View>
                <View style={styles.chipTextWrap}>
                  <Text style={styles.chipLabel}>Workplace Admin</Text>
                  <Text style={styles.chipValue} numberOfLines={1}>{data.ownerName}</Text>
                </View>
              </View>

              <View style={styles.metaChip}>
                <View style={styles.chipIconBox}>
                  <Feather name="users" size={15} color={Palette.brandPrimary} />
                </View>
                <View style={styles.chipTextWrap}>
                  <Text style={styles.chipLabel}>Team Size</Text>
                  <Text style={styles.chipValue}>{data.activeMembersCount} active members</Text>
                </View>
              </View>

              {data.address ? (
                <View style={styles.metaChipFull}>
                  <View style={styles.chipIconBox}>
                    <Feather name="map-pin" size={15} color={Palette.brandPrimary} />
                  </View>
                  <View style={styles.chipTextWrap}>
                    <Text style={styles.chipLabel}>Location</Text>
                    <Text style={styles.chipValue}>{data.address}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          </View>

          {/* Join Tracker status if request submitted */}
          {request ? <JoinStatusTracker request={request} /> : null}

          {/* Already a member */}
          {data.alreadyMember ? (
            <View style={styles.actionCard}>
              <View style={{ alignItems: 'center', marginBottom: 8 }}>
                <DocCheckmarkIllustration size={90} />
              </View>
              <Text style={[styles.title, { textAlign: 'center' }]}>Already a Member</Text>
              <Text style={[styles.body, { textAlign: 'center', marginBottom: 12 }]}>
                You are already part of this workplace team.
              </Text>
              <Pressable
                accessibilityRole="button"
                disabled={open.isPending}
                onPress={() => open.mutate()}
                style={styles.primary}
              >
                <Text style={styles.primaryText}>
                  {open.isPending ? 'Opening workplace…' : 'Open Workplace'}
                </Text>
              </Pressable>
            </View>
          ) : data.isInvited ? (
            /* Pre-approved / VIP invitation */
            <View style={styles.actionCard}>
              <View style={styles.vipBanner}>
                <View style={styles.vipIconTile}>
                  <Feather name="check-circle" size={22} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.vipBannerTitle}>You’re on the invite list!</Text>
                  <Text style={styles.vipBannerSub}>
                    Your admin {data.ownerName} already created your profile. Tap below to join immediately with no waiting required.
                  </Text>
                </View>
              </View>

              <View style={styles.userProfileTile}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitial}>
                    {(user?.name || user?.email || 'U')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.profileJoiningAs}>Joining as</Text>
                  <Text style={styles.profileName}>{user?.name || 'Team Member'}</Text>
                  <Text style={styles.profileEmail}>{user?.email}</Text>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                disabled={submit.isPending}
                onPress={() => submit.mutate()}
                style={[styles.primary, submit.isPending && { opacity: 0.6 }]}
              >
                <Feather name="arrow-right-circle" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.primaryText}>
                  {submit.isPending ? 'Joining workplace…' : 'Join Workplace Now'}
                </Text>
              </Pressable>
            </View>
          ) : !request && token ? (
            /* Open request to join */
            <View style={styles.actionCard}>
              <View style={styles.userProfileTile}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitial}>
                    {(user?.name || user?.email || 'U')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.profileJoiningAs}>Requesting access as</Text>
                  <Text style={styles.profileName}>{user?.name || 'Team Member'}</Text>
                  <Text style={styles.profileEmail}>{user?.email}</Text>
                </View>
              </View>

              <TextInput
                accessibilityLabel="Optional note to your admin"
                placeholder="Add a note to your admin (optional)"
                placeholderTextColor={Palette.textSecondary}
                value={note}
                onChangeText={setNote}
                maxLength={200}
                style={styles.input}
              />

              <Pressable
                accessibilityRole="button"
                disabled={submit.isPending}
                onPress={() => submit.mutate()}
                style={[styles.primary, submit.isPending && { opacity: 0.6 }]}
              >
                <Text style={styles.primaryText}>
                  {submit.isPending ? 'Sending request…' : 'Request to Join'}
                </Text>
              </Pressable>
            </View>
          ) : request?.status === 'PENDING' ? (
            <View style={styles.pendingNoticeCard}>
              <Feather name="clock" size={20} color={Palette.brandPrimary} />
              <Text style={styles.pendingNoticeText}>
                Your join request is submitted and pending review. You can close the app; your status will update automatically.
              </Text>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={async () => {
              await clearPendingJoin();
              client.setQueryData(['pending-join'], null);
              router.replace('/my-join-requests');
            }}
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>View my join requests</Text>
          </Pressable>
        </>
      ) : !token && !requestId && !tokenQuery.isPending ? (
        /* Manual Code / Link Input State */
        <View style={styles.card}>
          <View style={styles.artworkStage}>
            <View style={styles.ambientCircle} />
            <OfficeDoorwayIllustration width={240} height={150} />
          </View>

          <Text style={styles.title}>Enter workplace invitation</Text>
          <Text style={[styles.body, { textAlign: 'center', marginBottom: 6 }]}>
            Enter your 6 to 8 character invitation code (e.g. 509-250) or paste the link shared by your employer.
          </Text>

          <TextInput
            accessibilityLabel="Workplace invitation link or code"
            autoCapitalize="none"
            value={manual}
            onChangeText={setManual}
            placeholder="e.g. 509-250 or invite link"
            placeholderTextColor={Palette.textSecondary}
            style={[styles.input, { textAlign: 'center', letterSpacing: 1, fontWeight: '600' }]}
          />

          <Pressable
            accessibilityRole="button"
            disabled={!parseWorkplaceInvite(manual)}
            onPress={() =>
              router.replace({
                pathname: '/join',
                params: { token: parseWorkplaceInvite(manual)! },
              })
            }
            style={[styles.primary, !parseWorkplaceInvite(manual) && { opacity: 0.5 }]}
          >
            <Text style={styles.primaryText}>View Workplace</Text>
          </Pressable>
        </View>
      ) : null}
    </DetailPage>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 14,
    alignItems: 'center',
    shadowColor: '#1B2210',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    shadowColor: '#1B2210',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 3,
    marginBottom: 12,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 14,
    shadowColor: '#1B2210',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 12,
  },
  artworkStage: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
    width: '100%',
  },
  ambientCircle: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#EDF3DF',
    opacity: 0.8,
  },
  ambientCircleCoral: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#FDEAE7',
    opacity: 0.8,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDF3DF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
    gap: 6,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#5B692D',
  },
  badgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#3B451B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  workplaceName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1B2210',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  workplaceDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: Palette.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  chipsContainer: {
    width: '100%',
    gap: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9F3',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: '#ECEFE5',
  },
  metaChipFull: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9F3',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: '#ECEFE5',
  },
  chipIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EDF3DF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipTextWrap: {
    flex: 1,
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  chipValue: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1B2210',
  },
  vipBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#EDF3DF',
    borderWidth: 1,
    borderColor: '#D4E2BA',
  },
  vipIconTile: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#5B692D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vipBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#3B451B',
    marginBottom: 3,
  },
  vipBannerSub: {
    fontSize: 13,
    lineHeight: 18,
    color: '#556334',
  },
  userProfileTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#F8F9F3',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ECEFE5',
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#5B692D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  profileJoiningAs: {
    fontSize: 11,
    color: Palette.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  profileName: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  profileEmail: {
    fontSize: 12.5,
    color: Palette.textSecondary,
  },
  pendingNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F8F9F3',
    borderWidth: 1,
    borderColor: Palette.border,
    marginVertical: 4,
  },
  pendingNoticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: Palette.textSecondary,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: Palette.textPrimary,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: Palette.textSecondary,
  },
  input: {
    minHeight: 50,
    borderWidth: 1.5,
    borderColor: Palette.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Palette.textPrimary,
    fontSize: 14.5,
    backgroundColor: '#FFFFFF',
  },
  primary: {
    backgroundColor: Palette.brandPrimary,
    minHeight: 50,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Palette.brandPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryText: {
    fontSize: 15.5,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondary: {
    minHeight: 46,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: Palette.brandPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
});
