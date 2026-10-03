/**
 * bootService.ts
 *
 * Centralized startup orchestrator. Runs every async boot task in a
 * single parallel wave so the splash screen is shown for the absolute
 * minimum time. Called once from _layout.tsx; never repeated.
 *
 * Timeline:
 *   t=0  fire: [hasSeenWelcome, refreshToken, pendingPinApproval,
 *               themeInit, notificationInit, adMobInit] all in parallel
 *   t=token  fire: [/auth/me + workspace pref] in parallel once we have a token
 *   t=me     fire: initLockState(user) immediately — overlaps with any
 *            remaining renders, does NOT block navigation
 */

import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { useLockStore } from '../stores/lockStore';
import {
  getStoredRefreshToken,
  clearStoredRefreshToken,
  refreshAccessToken,
  apiRequest,
  ApiError,
  setMemoryAccessToken,
  invalidateSession,
  getSessionVersion,
} from './api';
import { readPreference, getHasSeenWelcome, getStoredPendingPinApproval } from './storage';
import { notificationService } from './notificationService';
import { adMobService } from './adMobService';

export interface BootResult {
  /** Auth + workplaces resolved */
  authDone: true;
  /** hasSeenWelcome pre-loaded so index.tsx never needs its own async */
  hasSeenWelcome: boolean;
}

let bootPromise: Promise<BootResult> | null = null;

/** Returns the pre-fetched welcome flag; only valid after boot() resolves. */
let _cachedHasSeenWelcome: boolean = false;
export const getCachedHasSeenWelcome = () => _cachedHasSeenWelcome;

/** The userId for which initLockState was already called at boot time. */
let _bootInitializedUserId: string | null = null;
export const getBootInitializedUserId = () => _bootInitializedUserId;

/**
 * Run the full startup sequence exactly once. Subsequent calls return
 * the same Promise so React StrictMode double-invocations are safe.
 */
export function boot(): Promise<BootResult> {
  if (bootPromise) return bootPromise;
  bootPromise = runBoot();
  return bootPromise;
}

/** Reset for logout / re-init — call before `boot()` again. */
export function resetBoot(): void {
  bootPromise = null;
  _cachedHasSeenWelcome = false;
  _bootInitializedUserId = null;
}

// ---------------------------------------------------------------------------
// Helpers that mirror the original authStore logic but run inside bootService
// ---------------------------------------------------------------------------

function sortMemberships<T extends { createdAt?: string | Date }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tB - tA;
  });
}

async function runBoot(): Promise<BootResult> {
  // ── Wave 0: fire everything that does not need a token ──────────────────
  const [hasSeenWelcome, refreshToken, storedPending] = await Promise.all([
    getHasSeenWelcome().catch(() => false),
    getStoredRefreshToken().catch(() => null),
    getStoredPendingPinApproval().catch(() => null),

    // Side-effects that can run in parallel, results ignored at boot
    useThemeStore.getState().initTheme().catch(() => {}),
    notificationService.init().catch(() => {}),
    Promise.resolve().then(() => adMobService.initAppOpenAds()).catch(() => {}),
  ]);

  _cachedHasSeenWelcome = Boolean(hasSeenWelcome);

  const authSet = useAuthStore.setState.bind(useAuthStore);

  if (storedPending) {
    authSet({ pendingPinApproval: storedPending });
  }

  if (!refreshToken) {
    authSet({
      user: null, activeWorkplace: null, memberships: [],
      isAuthenticated: false, isLoading: false, isWorkplaceConfirmed: false,
    });
    return { authDone: true, hasSeenWelcome: _cachedHasSeenWelcome };
  }

  const version = getSessionVersion();

  // ── Reviewer shortcut (no network) ──────────────────────────────────────
  if (refreshToken === 'reviewer-bypass-refresh-token-do-not-use-in-production') {
    try {
      const { getReviewerSessionByToken } = await import('./reviewerLogin');
      const reviewerState = await getReviewerSessionByToken();
      if (reviewerState && version === getSessionVersion()) {
        setMemoryAccessToken('reviewer-bypass-access-token-do-not-use-in-production');
        authSet({ ...reviewerState, isLoading: false, restorationError: null });
        return { authDone: true, hasSeenWelcome: _cachedHasSeenWelcome };
      }
    } catch {}
    authSet({ user: null, activeWorkplace: null, memberships: [], isAuthenticated: false, isLoading: false });
    return { authDone: true, hasSeenWelcome: _cachedHasSeenWelcome };
  }

  // ── Wave 1: refresh access token ────────────────────────────────────────
  let accessToken: string;
  try {
    accessToken = await refreshAccessToken();
  } catch (error) {
    if (version !== getSessionVersion()) {
      authSet({ isLoading: false });
      return { authDone: true, hasSeenWelcome: _cachedHasSeenWelcome };
    }
    if (!(error instanceof ApiError) || ![401, 403].includes(error.statusCode)) {
      authSet({ isLoading: false, restorationError: 'Unable to restore your session. Check your connection and retry.' });
      return { authDone: true, hasSeenWelcome: _cachedHasSeenWelcome };
    }
    invalidateSession();
    await clearStoredRefreshToken().catch(() => {});
    authSet({ user: null, activeWorkplace: null, memberships: [], isAuthenticated: false, isLoading: false, isWorkplaceConfirmed: false });
    return { authDone: true, hasSeenWelcome: _cachedHasSeenWelcome };
  }

  if (!accessToken || version !== getSessionVersion()) {
    authSet({ user: null, activeWorkplace: null, memberships: [], isAuthenticated: false, isLoading: false });
    return { authDone: true, hasSeenWelcome: _cachedHasSeenWelcome };
  }

  // ── Wave 2: /auth/me then immediately read workspace pref ────────────────
  // We can't key the workspace pref until we know the userId, so /auth/me
  // must come first. The pref read is a fast local SecureStore call that
  // immediately follows — this is still faster than the previous approach
  // because we removed the extra sequential token refresh → /auth/me → pref.
  let me: { user: import('../stores/authStore').UserProfile; memberships: import('../stores/authStore').WorkplaceMembership[] };
  let savedWorkplace: string | null;

  try {
    me = await apiRequest<typeof me>('/auth/me');
    // Now that we have userId, read the saved workplace preference in parallel
    // with any other work React has already started rendering.
    savedWorkplace = await readPreference(`bizora_workplace_${me.user.id}`).catch(() => null);
  } catch (error) {
    if (version !== getSessionVersion()) {
      authSet({ isLoading: false });
      return { authDone: true, hasSeenWelcome: _cachedHasSeenWelcome };
    }
    if (!(error instanceof ApiError) || ![401, 403].includes(error.statusCode)) {
      authSet({ isLoading: false, restorationError: 'Unable to restore your session. Check your connection and retry.' });
      return { authDone: true, hasSeenWelcome: _cachedHasSeenWelcome };
    }
    invalidateSession();
    await clearStoredRefreshToken().catch(() => {});
    authSet({ user: null, activeWorkplace: null, memberships: [], isAuthenticated: false, isLoading: false, isWorkplaceConfirmed: false });
    return { authDone: true, hasSeenWelcome: _cachedHasSeenWelcome };
  }

  if (version !== getSessionVersion()) {
    authSet({ isLoading: false });
    return { authDone: true, hasSeenWelcome: _cachedHasSeenWelcome };
  }

  const sorted = sortMemberships(me.memberships);
  const activeMemberships = sorted.filter((m) => m.status === 'ACTIVE');
  const activeWp = activeMemberships.find((m) => m.workplaceId === savedWorkplace) || activeMemberships[0] || null;
  const hasMultiple = activeMemberships.length > 1 && activeWp?.workplaceId !== savedWorkplace;

  authSet({
    user: me.user,
    memberships: sorted,
    activeWorkplace: activeWp,
    isAuthenticated: true,
    isLoading: false,
    isWorkplaceConfirmed: !hasMultiple,
    pendingPinApproval: null,
  });

  // ── Wave 3: initLockState — fire & forget, does NOT block navigation ─────
  // The AppLockProvider shows a lock overlay over the content if MPIN is set;
  // there is no reason to stall the UI waiting for biometric caps and
  // /auth/mpin/status. We fire it immediately and record the userId so that
  // AppLockProvider can skip re-running it.
  _bootInitializedUserId = me.user.id;
  void useLockStore.getState().initLockState(me.user).catch(() => {});

  return { authDone: true, hasSeenWelcome: _cachedHasSeenWelcome };
}
