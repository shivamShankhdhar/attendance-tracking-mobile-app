import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { useLockStore } from '../stores/lockStore';
import { getTrackedJoin, clearTrackedJoin } from '../services/workplaceLinks';
import { attendanceApi } from '../services/attendanceApi';
import { openJoinedWorkplace } from '../services/joinNavigation';
import { useForeground } from '../hooks/use-foreground';
import { queryClient } from '../providers/QueryProvider';
import { showError, showSuccess } from '../stores/alertStore';

export function JoinRequestMonitor() {
  const userId = useAuthStore((s) => s.isAuthenticated ? s.user?.id : undefined);
  const locked = useLockStore((s) => s.isLocked);
  const foreground = useForeground();
  const router = useRouter();
  const processing = useRef(false);
  const tracking = useQuery({ queryKey: ['tracked-join', userId], queryFn: () => getTrackedJoin(userId!), enabled: Boolean(userId), staleTime: Infinity });
  const requestId = tracking.data?.requestId;
  const status = useQuery({ queryKey: ['my-join-request', userId, requestId], queryFn: () => attendanceApi.getMyJoinRequest(requestId!), enabled: Boolean(userId && requestId && foreground && !locked), staleTime: 0, refetchInterval: 5000 });
  useEffect(() => {
    const request = status.data?.latestRequest;
    if (!userId || !requestId || !request || locked || processing.current || !foreground) return;
    if (!['APPROVED', 'REJECTED', 'CANCELLED'].includes(request.status)) return;
    processing.current = true;
    void (async () => {
      if (request.status === 'APPROVED') {
        await openJoinedWorkplace(userId, status.data!.workplaceId, requestId, tracking.data?.token);
        if (useAuthStore.getState().user?.id !== userId) return;
        showSuccess(`Your request to join ${status.data!.workplaceName} was approved!`);
        router.replace('/');
      } else {
        await clearTrackedJoin(userId);
        queryClient.setQueryData(['tracked-join', userId], null);
        if (request.status === 'REJECTED' && useAuthStore.getState().user?.id === userId) {
          showError(`Your request to join ${status.data!.workplaceName} was not approved. ${request.rejectionReason || 'Contact the admin for clarification.'}`);
        }
      }
    })().catch(() => { /* A transient profile failure is retried by the next status refresh. */ }).finally(() => { processing.current = false; });
  }, [userId, requestId, status.data, status.dataUpdatedAt, locked, foreground, router, tracking.data?.token]);
  return null;
}
