import { formatFriendlyDate } from '../utils/attendance';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useIsFocused } from 'expo-router/react-navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { attendanceApi, type JoinRequestStatus } from '../services/attendanceApi';
import { useAuthStore } from '../stores/authStore';
import { useForeground } from '../hooks/use-foreground';
import { StatusChip } from '../components/StatusChip';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { AdBanner } from '../components/AdBanner';
import { Palette } from '../constants/colors';
import { HeaderBackgroundArt } from '../components/illustrations/HeaderBackgroundArt';

interface RequestRow {
  id: string;
  status: JoinRequestStatus;
  requestedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
  note?: string;
  name?: string;
  email?: string;
  workplaceName?: string;
}

export function JoinRequestsScreen({ admin = false, embedded = false, workplaceId: suppliedWorkplaceId }: { admin?: boolean; embedded?: boolean; workplaceId?: string }) {
  const { workplaceId: routeWorkplaceId = '' } = useLocalSearchParams<{ workplaceId?: string }>();
  const workplaceId = suppliedWorkplaceId ?? routeWorkplaceId;
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const authenticated = useAuthStore((s) => s.isAuthenticated);
  const membership = useAuthStore((s) =>
    s.memberships.find(
      (m) => m.workplaceId === workplaceId && m.status === 'ACTIVE' && m.role === 'EMPLOYER'
    )
  );
  const allowed = authenticated && (!admin || Boolean(membership));
  const focused = useIsFocused();
  const foreground = useForeground();
  const client = useQueryClient();
  const [filter, setFilter] = useState<'ALL' | JoinRequestStatus>('ALL');
  const [review, setReview] = useState<{ request: RequestRow; approve: boolean } | null>(null);
  const [reason, setReason] = useState('');

  const key = admin ? ['admin-join-requests', user?.id, workplaceId] : ['my-join-requests', user?.id];

  // Disable aggressive refetchInterval loop so page doesn't refresh constantly; rely on manual refresh button
  const query = useQuery<RequestRow[]>({
    queryKey: key,
    queryFn: () => (admin ? attendanceApi.getWorkplaceJoinRequests(workplaceId) : attendanceApi.getMyJoinRequests()),
    enabled: allowed && focused && foreground,
    staleTime: 30000,
    refetchInterval: false,
  });

  const mutation = useMutation({
    mutationFn: async ({ request, approve }: { request: RequestRow; approve: boolean }) =>
      approve
        ? attendanceApi.approveJoinRequest(workplaceId, request.id)
        : attendanceApi.rejectJoinRequest(workplaceId, request.id, { reason: reason.trim() }),
    onMutate: async ({ request, approve }) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<RequestRow[]>(key);
      client.setQueryData<RequestRow[]>(key, (rows) =>
        rows?.map((row) =>
          row.id === request.id
            ? {
                ...row,
                status: approve ? 'APPROVED' : 'REJECTED',
                reviewedAt: new Date().toISOString(),
                rejectionReason: approve ? undefined : reason.trim(),
              }
            : row
        )
      );
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) client.setQueryData(key, context.previous);
    },
    onSuccess: () => {
      setReview(null);
      setReason('');
    },
    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: key }),
        client.invalidateQueries({ queryKey: ['employer', user?.id, workplaceId] }),
        client.invalidateQueries({ queryKey: ['workplace-details', user?.id, workplaceId] }),
      ]);
    },
  });

  if (!authenticated) return <Redirect href="/" />;

  const rows = (query.data || []).filter((row) => filter === 'ALL' || row.status === filter);

  const content = (
    <View style={styles.page}>
      {/* Header section matching tabs design with art background & right-side refresh button */}
      <View style={styles.headerWrapper}>
        {!embedded && <HeaderBackgroundArt />}
        <View style={styles.headerContentRow}>
{!embedded && (          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={styles.backButton}
          >
            <Feather name="arrow-left" size={20} color={Palette.textPrimary} />
          </Pressable>)}

          <View style={styles.headerTitleCol}>
            <Text style={styles.headerPreTitle}>{admin ? 'Access Management' : 'Invitations & Access'}</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {admin ? 'Join requests' : 'My join requests'}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {admin ? membership?.workplaceName || 'Workplace' : 'Track your workplace access requests'}
            </Text>
          </View>

          {/* Right Refresh Button */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Refresh join requests"
            onPress={() => void query.refetch()}
            style={styles.headerRefreshBtn}
            disabled={query.isFetching}
            activeOpacity={0.7}
          >
            {query.isFetching ? (
              <ActivityIndicator size="small" color={Palette.brandPrimary} />
            ) : (
              <Feather name="refresh-cw" size={17} color={Palette.brandPrimary} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {!allowed ? (
        <Text style={styles.message}>You need admin access to review this workplace.</Text>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={rows}
          keyExtractor={(item) => item.id}
          refreshing={query.isRefetching}
          onRefresh={() => void query.refetch()}
          ListHeaderComponent={
            <View style={styles.intro}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filters}
              >
                {(['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const).map((status) => (
                  <Pressable
                    key={status}
                    accessibilityRole="button"
                    accessibilityState={{ selected: filter === status }}
                    onPress={() => setFilter(status)}
                    style={[styles.filter, filter === status && styles.selected]}
                  >
                    <Text style={[styles.filterText, filter === status && { color: '#fff' }]}>
                      {status.charAt(0) + status.slice(1).toLowerCase()}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              {query.isError ? (
                <Text accessibilityRole="alert" style={styles.error}>
                  {query.error.message} Tap refresh to retry.
                </Text>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            query.isPending ? (
              <ActivityIndicator color={Palette.brandPrimary} style={{ marginVertical: 24 }} />
            ) : !query.isError ? (
              <View style={styles.card}>
                <Feather name="inbox" size={28} color={Palette.brandPrimary} />
                <Text style={styles.name}>No {filter === 'ALL' ? '' : filter.toLowerCase() + ' '}requests yet</Text>
                <Text style={styles.subtitle}>
                  {admin
                    ? 'Share your workplace invitation to welcome new team members.'
                    : 'Open the invitation your admin shared to request access.'}
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={styles.copy}>
                  <Text style={styles.name}>{admin ? item.name : item.workplaceName}</Text>
                  {admin && item.email ? (
                    <Text selectable style={styles.subtitle}>
                      {item.email}
                    </Text>
                  ) : null}
                </View>
                <StatusChip status={item.status} size="sm" />
              </View>
              <Text style={styles.date}>Sent {formatFriendlyDate(item.requestedAt, 'd MMM yyyy · h:mm a')}</Text>
              {item.note ? <Text style={styles.subtitle}>{item.note}</Text> : null}
              {item.status === 'REJECTED' ? (
                <Text style={styles.error}>{item.rejectionReason || 'Contact the workplace admin for clarification.'}</Text>
              ) : null}
              {admin && item.status === 'PENDING' ? (
                <View style={styles.actions}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={mutation.isPending}
                    onPress={() => {
                      mutation.reset();
                      setReason('');
                      setReview({ request: item, approve: true });
                    }}
                    style={styles.primary}
                  >
                    <Text style={styles.primaryText}>Approve</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={mutation.isPending}
                    onPress={() => {
                      mutation.reset();
                      setReason('');
                      setReview({ request: item, approve: false });
                    }}
                    style={styles.secondary}
                  >
                    <Text style={styles.rejectText}>Reject</Text>
                  </Pressable>
                </View>
              ) : !admin ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/join', params: { requestId: item.id } })}
                  style={styles.secondary}
                >
                  <Text style={styles.linkText}>
                    {item.status === 'APPROVED' ? 'Open workplace' : 'View details & status'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )}
        />
      )}
      {!embedded && <AdBanner position="bottom" safeBottom />}
      <ConfirmDialog
        visible={Boolean(review)}
        title={review?.approve ? 'Approve join request?' : 'Reject join request?'}
        message={
          mutation.error?.message ||
          `${review?.request.name || 'This person'} ${
            review?.approve
              ? 'will be added to your workplace.'
              : 'will see that their request was not approved.'
          }`
        }
        confirmLabel={review?.approve ? 'Approve' : 'Reject'}
        isDestructive={!review?.approve}
        loading={mutation.isPending}
        inputPlaceholder={review && !review.approve ? 'Reason (optional)' : undefined}
        inputValue={reason}
        onChangeInput={(value) => setReason(value.slice(0, 300))}
        onCancel={() => {
          if (!mutation.isPending) setReview(null);
        }}
        onConfirm={() => {
          if (review && !mutation.isPending) mutation.mutate(review);
        }}
      />
    </View>
  );
  return embedded ? content : <SafeAreaView style={styles.page} edges={['top', 'bottom']}>{content}</SafeAreaView>;
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  headerWrapper: {
    backgroundColor: Palette.canvas,
    paddingTop: 6,
    paddingBottom: 14,
    paddingHorizontal: 16,
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 0,
  },
  headerContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1B2210',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  headerTitleCol: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerPreTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.textPrimary,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 1,
  },
  headerRefreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1B2210',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  list: {
    padding: 16,
    gap: 12,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    flexGrow: 1,
  },
  intro: {
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: Palette.textSecondary,
    lineHeight: 18,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  filter: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 16,
  },
  selected: {
    backgroundColor: Palette.brandPrimary,
    borderColor: Palette.brandPrimary,
  },
  filterText: {
    fontSize: 12.5,
    color: Palette.textPrimary,
    fontWeight: '600',
  },
  card: {
    padding: 16,
    backgroundColor: Palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 8,
    shadowColor: '#1B2210',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  date: {
    fontSize: 11.5,
    color: Palette.textSecondary,
  },
  error: {
    color: Palette.danger,
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  primary: {
    minHeight: 38,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: Palette.brandPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryText: {
    fontWeight: '700',
    color: '#fff',
    fontSize: 13,
  },
  secondary: {
    minHeight: 38,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.border,
    alignSelf: 'flex-start',
    backgroundColor: Palette.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectText: {
    color: Palette.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  linkText: {
    color: Palette.brandPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  message: {
    padding: 24,
    color: Palette.textSecondary,
  },
});
