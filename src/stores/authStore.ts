import { queryClient } from '../providers/QueryProvider';
import { create } from 'zustand';
import {
  invalidateSession, getSessionVersion, getMemoryAccessToken, refreshAccessToken, setUnauthorizedHandler,
  apiRequest, ApiError,
  setMemoryAccessToken,
  saveRefreshToken,
  getStoredRefreshToken,
  clearStoredRefreshToken,
} from '../services/api';
import {
  readPreference, savePreference,
  getStoredPendingPinApproval,
  setStoredPendingPinApproval,
  clearStoredPendingPinApproval,
  StoredPendingPinApproval,
} from '../services/storage';
import { useLockStore } from './lockStore';

export type { StoredPendingPinApproval };


export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  status: 'ACTIVE' | 'INACTIVE';
  hasMpin?: boolean;
  biometricEnabled?: boolean;
}

export interface WorkplaceMembership {
  id: string;
  workplaceId: string;
  workplaceName: string;
  workplaceCode?: string;
  adminName?: string;
  address?: string;
  timezone: string;
  role: 'EMPLOYER' | 'EMPLOYEE';
  employeeCode?: string;
  status: 'ACTIVE' | 'INVITED';
  allowEmployeeViewHistory?: boolean;
  attendanceSettings?: {
    requireWifi?: boolean;
    autoCloseHour?: number;
    allowEmployeeViewHistory?: boolean;
  };
  createdAt?: string | Date;
  memberCount?: number;
}

const sortMemberships = (list: WorkplaceMembership[]) => {
  return [...list].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });
};

interface AuthState {
  user: UserProfile | null;
  activeWorkplace: WorkplaceMembership | null;
  memberships: WorkplaceMembership[];
  isLoading: boolean;
  restorationError: string | null;
  isAuthenticated: boolean;
  isWorkplaceConfirmed: boolean;
  pendingPinApproval: StoredPendingPinApproval | null;

  onboardingInitialStep: 'welcome-chooser' | 'create-workplace';
  setOnboardingInitialStep: (step: 'welcome-chooser' | 'create-workplace') => void;

  initializeAuth: () => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithPin: (employeeCode: string, pin: string, workplaceId?: string) => Promise<void>;
  checkPinLoginApprovalStatus: () => Promise<boolean>;
  clearPendingPinApproval: () => Promise<void>;
  confirmWorkplaceSelection: (membership?: WorkplaceMembership) => void;
  openWorkplaceSelector: () => void;
  selectWorkplace: (membership: WorkplaceMembership) => void;
  clearActiveWorkplace: () => void;
  refreshProfile: () => Promise<void>;
  resetMyAccount: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  activeWorkplace: null,
  memberships: [],
  isLoading: true,
  restorationError: null,
  isAuthenticated: false,
  isWorkplaceConfirmed: false,
  pendingPinApproval: null,
  onboardingInitialStep: 'welcome-chooser',
  setOnboardingInitialStep: (step) => set({ onboardingInitialStep: step }),

  initializeAuth: async () => {
    const version = getSessionVersion();
    try {
      set({ isLoading: true, restorationError: null });
      const [storedPending, refreshToken] = await Promise.all([getStoredPendingPinApproval(), getStoredRefreshToken()]);
      if (version !== getSessionVersion()) return;
      if (storedPending) {
        set({ pendingPinApproval: storedPending });
      }

      if (!refreshToken) {
        set({ user: null, activeWorkplace: null, memberships: [], isAuthenticated: false, isLoading: false, isWorkplaceConfirmed: false });
        return;
      }

      // ── Reviewer session restoration (no network call) ──────────────────────
      if (refreshToken === 'reviewer-bypass-refresh-token-do-not-use-in-production') {
        // Lazily import to avoid circular deps at module init time
        const { getReviewerSessionByToken } = await import('../services/reviewerLogin');
        const reviewerState = await getReviewerSessionByToken();
        if (reviewerState && version === getSessionVersion()) {
          setMemoryAccessToken('reviewer-bypass-access-token-do-not-use-in-production');
          set({ ...reviewerState, isLoading: false, restorationError: null });
          return;
        }
      }
      // ── End reviewer restoration ────────────────────────────────────────────

      const accessToken = await refreshAccessToken();
      if (accessToken) {
        const me = await apiRequest<{ user: UserProfile; memberships: WorkplaceMembership[] }>('/auth/me');

        if (version !== getSessionVersion()) return;
        const sorted = sortMemberships(me.memberships);
        const activeMemberships = sorted.filter((m) => m.status === 'ACTIVE');
        const savedWorkplace = await readPreference(`bizora_workplace_${me.user.id}`).catch(() => null);
        if (version !== getSessionVersion()) return;
        const activeWp = activeMemberships.find((m) => m.workplaceId === savedWorkplace) || activeMemberships[0] || null;
        const hasMultiple = activeMemberships.length > 1 && activeWp?.workplaceId !== savedWorkplace;

        set({
          user: me.user,
          memberships: sorted,
          activeWorkplace: activeWp,
          isAuthenticated: true,
          isLoading: false,
          isWorkplaceConfirmed: !hasMultiple,
          pendingPinApproval: null,
        });
        return;
      }
    } catch (error) {
      if (version !== getSessionVersion()) return;
      // Network/server failures are retryable; only rejected credentials end a session.
      if (!(error instanceof ApiError) || ![401, 403].includes(error.statusCode)) {
        set({ isLoading: false, restorationError: 'Unable to restore your session. Check your connection and retry.' });
        return;
      }
      invalidateSession();
      await clearStoredRefreshToken().catch(() => {});
    }

    set({ user: null, activeWorkplace: null, memberships: [], isAuthenticated: false, isLoading: false, isWorkplaceConfirmed: false });
  },

  loginWithGoogle: async (idToken: string) => {
    const version = getSessionVersion();
    set({ isLoading: true, restorationError: null });
    try {
      const res = await apiRequest<{
        accessToken: string;
        refreshToken: string;
        user: UserProfile;
        memberships: WorkplaceMembership[];
      }>('/auth/google/exchange', {
        method: 'POST',
        body: {
          idToken,
        },
        skipAuth: true,
      });

      if (version !== getSessionVersion()) return;
      await clearStoredPendingPinApproval();
      setMemoryAccessToken(res.accessToken);
      await saveRefreshToken(res.refreshToken);
      if (version !== getSessionVersion()) return;
      queryClient.clear();

      const sorted = sortMemberships(res.memberships);
      const activeMemberships = sorted.filter((m) => m.status === 'ACTIVE');
      const activeWp = activeMemberships[0] || null;
      const hasMultiple = activeMemberships.length > 1;

      set({
        user: res.user,
        memberships: sorted,
        activeWorkplace: activeWp,
        isAuthenticated: true,
        isLoading: false,
        isWorkplaceConfirmed: !hasMultiple,
        pendingPinApproval: null,
      });
      if (!res.user.hasMpin) {
        useLockStore.getState().setShouldPromptSetupAfterSignIn(true);
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  loginWithPin: async (employeeCode, pin, workplaceId) => {
    const version = getSessionVersion();
    set({ isLoading: true, restorationError: null });
    try {
      const res = await apiRequest<{
        accessToken?: string;
        refreshToken?: string;
        user?: UserProfile;
        memberships?: WorkplaceMembership[];
        pendingApproval?: boolean;
        workplaceId?: string;
        workplaceName?: string;
        employeeCode?: string;
        employeeName?: string;
        requestedAt?: string;
        requestId?: string;
        message?: string;
      }>('/auth/employee-pin-login', {
        method: 'POST',
        body: { employeeCode, pin, ...(workplaceId ? { workplaceId } : {}) },
        skipAuth: true,
      });

      if (version !== getSessionVersion()) return;

      if (res.pendingApproval) {
        const pending: StoredPendingPinApproval = {
          workplaceId: res.workplaceId || workplaceId,
          workplaceName: res.workplaceName || 'Workplace',
          employeeCode: res.employeeCode || employeeCode,
          employeeName: res.employeeName || 'Employee',
          requestedAt: res.requestedAt || new Date().toISOString(),
          requestId: res.requestId,
          message: res.message,
        };
        await setStoredPendingPinApproval(pending);
        set({
          pendingPinApproval: pending,
          isLoading: false,
          isAuthenticated: false,
        });
        return;
      }

      if (!res.accessToken || !res.refreshToken || !res.user) {
        throw new Error('Authentication response is missing credentials.');
      }

      await clearStoredPendingPinApproval();
      setMemoryAccessToken(res.accessToken);
      await saveRefreshToken(res.refreshToken);
      if (version !== getSessionVersion()) return;
      queryClient.clear();

      const sorted = sortMemberships(res.memberships || []);
      const activeMemberships = sorted.filter((m) => m.status === 'ACTIVE');
      const activeWp = activeMemberships[0] || null;
      const hasMultiple = activeMemberships.length > 1;

      set({
        user: res.user,
        memberships: sorted,
        activeWorkplace: activeWp,
        isAuthenticated: true,
        isLoading: false,
        isWorkplaceConfirmed: !hasMultiple,
        pendingPinApproval: null,
      });
      if (res.user && !res.user.hasMpin) {
        useLockStore.getState().setShouldPromptSetupAfterSignIn(true);
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  checkPinLoginApprovalStatus: async () => {
    const pending = get().pendingPinApproval;
    if (!pending) return false;
    const version = getSessionVersion();
    const isCurrent = () => version === getSessionVersion() && get().pendingPinApproval === pending;

    try {
      const url = `/auth/employee-pin-status?employeeCode=${encodeURIComponent(pending.employeeCode)}${
        pending.workplaceId ? `&workplaceId=${encodeURIComponent(pending.workplaceId)}` : ''
      }`;
      const res = await apiRequest<{
        approved?: boolean;
        rejected?: boolean;
        status?: string;
        accessToken?: string;
        refreshToken?: string;
        user?: UserProfile;
        memberships?: WorkplaceMembership[];
        message?: string;
      }>(url, {
        method: 'GET',
        skipAuth: true,
      });

      if (!isCurrent()) return false;
      if (res.approved && res.accessToken && res.refreshToken && res.user) {
        await clearStoredPendingPinApproval();
        if (!isCurrent()) return false;
        setMemoryAccessToken(res.accessToken);
        await saveRefreshToken(res.refreshToken);
        if (!isCurrent()) return false;
        queryClient.clear();

        const sorted = sortMemberships(res.memberships || []);
        const activeMemberships = sorted.filter((m) => m.status === 'ACTIVE');
        const activeWp = activeMemberships[0] || null;
        const hasMultiple = activeMemberships.length > 1;

        set({
          user: res.user,
          memberships: sorted,
          activeWorkplace: activeWp,
          isAuthenticated: true,
          isLoading: false,
          isWorkplaceConfirmed: !hasMultiple,
          pendingPinApproval: null,
        });
        if (res.user && !res.user.hasMpin) {
          useLockStore.getState().setShouldPromptSetupAfterSignIn(true);
        }
        return true;
      }

      if (res.rejected) {
        await clearStoredPendingPinApproval();
        if (!isCurrent()) return false;
        set({ pendingPinApproval: null });
        throw new Error(res.message || 'Your login request was rejected by your workplace admin.');
      }

      return false;
    } catch (err) {
      throw err;
    }
  },

  clearPendingPinApproval: async () => {
    const cancellingSignIn = Boolean(get().pendingPinApproval) && !get().isAuthenticated;
    set({ pendingPinApproval: null });
    if (cancellingSignIn) invalidateSession();
    await Promise.all([clearStoredPendingPinApproval(), cancellingSignIn ? clearStoredRefreshToken() : Promise.resolve()]);
  },

  confirmWorkplaceSelection: (membership) => {
    if (membership) {
      const allowed = get().memberships.find(
        (m) => (m.id === membership.id || m.workplaceId === membership.workplaceId) && m.status === 'ACTIVE'
      );
      if (allowed) {
        set({ activeWorkplace: allowed, isWorkplaceConfirmed: true });
      const userId = get().user?.id;
      if (userId) void savePreference(`bizora_workplace_${userId}`, allowed.workplaceId).catch(() => {});
        return;
      }
    }
    set({ isWorkplaceConfirmed: true });
  },

  openWorkplaceSelector: () => {
    set({ isWorkplaceConfirmed: false });
  },

  selectWorkplace: (membership) => {
    const allowed = get().memberships.find(
      (m) => (m.id === membership.id || m.workplaceId === membership.workplaceId) && m.status === 'ACTIVE'
    );
    if (allowed) {
      set({ activeWorkplace: allowed, isWorkplaceConfirmed: true });
      const userId = get().user?.id;
      if (userId) void savePreference(`bizora_workplace_${userId}`, allowed.workplaceId).catch(() => {});
    }
  },

  clearActiveWorkplace: () => {
    set({ activeWorkplace: null });
  },

  resetMyAccount: async () => {
    const version = getSessionVersion();
    try {
      await apiRequest('/workplaces/reset-my-account', { method: 'POST' });
      if (version !== getSessionVersion()) return;
      queryClient.clear();
      set({ activeWorkplace: null, memberships: [] });
    } catch (err) {
      throw err;
    }
  },

  refreshProfile: async () => {
    const version = getSessionVersion();
    try {
      const me = await apiRequest<{ user: UserProfile; memberships: WorkplaceMembership[] }>('/auth/me');
      if (version !== getSessionVersion()) return;
      const sorted = sortMemberships(me.memberships);
      const currentActiveId = get().activeWorkplace?.workplaceId;
      const matchingActive = sorted.find((m) => m.workplaceId === currentActiveId && m.status === 'ACTIVE');

      set({
        user: me.user,
        memberships: sorted,
        activeWorkplace: matchingActive || (sorted.find((m) => m.status === 'ACTIVE') || null),
      });
    } catch (err) {
      throw err;
    }
  },

  logout: async () => {
    const token = getMemoryAccessToken();
    invalidateSession();
    queryClient.clear();
    setMemoryAccessToken(null);
    const pendingCleanup = clearStoredPendingPinApproval();
    set({ user: null, activeWorkplace: null, memberships: [], isAuthenticated: false, isLoading: false, restorationError: null, isWorkplaceConfirmed: false, pendingPinApproval: null });
    const clearing = clearStoredRefreshToken();
    // Reset the boot state so the next sign-in triggers a fresh sequence
    import('../services/bootService').then(({ resetBoot }) => resetBoot()).catch(() => {});
    if (token) void apiRequest('/auth/logout', { method: 'POST', skipAuth: true, headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    await Promise.all([clearing, pendingCleanup]);
  },
}));

setUnauthorizedHandler(() => { void useAuthStore.getState().logout().catch(() => {}); });
