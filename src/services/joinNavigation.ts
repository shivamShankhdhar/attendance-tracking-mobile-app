import { useAuthStore } from '../stores/authStore';
import { clearPendingJoin, clearTrackedJoin, getPendingJoin, getTrackedJoin } from './workplaceLinks';
import { queryClient } from '../providers/QueryProvider';

let opening: Promise<void> | null = null;
export function openJoinedWorkplace(userId: string, workplaceId: string, requestId?: string, token?: string) {
  if (opening) return opening;
  opening = (async () => {
    await useAuthStore.getState().refreshProfile();
    const state = useAuthStore.getState();
    if (state.user?.id !== userId || !state.isAuthenticated) throw new Error('Sign in to open this workplace.');
    const membership = state.memberships.find((m) => m.workplaceId === workplaceId && m.status === 'ACTIVE');
    if (!membership) throw new Error('Your membership is not available yet. Please try again.');
    state.selectWorkplace(membership);
    const tracked = await getTrackedJoin(userId);
    if (requestId && tracked?.requestId === requestId) {
      await clearTrackedJoin(userId);
      queryClient.setQueryData(['tracked-join', userId], null);
      token ||= tracked.token;
    }
    if (token && await getPendingJoin() === token) await clearPendingJoin();
    queryClient.setQueryData(['pending-join'], await getPendingJoin());
  })().finally(() => { opening = null; });
  return opening;
}
