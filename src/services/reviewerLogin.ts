/**
 * Reviewer / Demo Login Service
 *
 * Provides two hardcoded test accounts for Google Play Console reviewers.
 * Credentials bypass Google OAuth, 2FA, email verification, and all network calls.
 *
 * Accounts:
 *  reviewer_employer@test.com / ReviewPass123!  -> EMPLOYER role
 *  reviewer_employee@test.com / ReviewPass123!  -> EMPLOYEE role
 */

import { useAuthStore, UserProfile, WorkplaceMembership } from '../stores/authStore';
import { setMemoryAccessToken, saveRefreshToken, invalidateSession } from '../services/api';
import { clearStoredPendingPinApproval } from '../services/storage';
import { queryClient } from '../providers/QueryProvider';
import { useLockStore } from '../stores/lockStore';

// Hardcoded reviewer accounts
const REVIEWER_ACCOUNTS: Record<string, {
  email: string;
  password: string;
  user: UserProfile;
  membership: WorkplaceMembership;
}> = {
  'reviewer_employer@test.com': {
    email: 'reviewer_employer@test.com',
    password: 'ReviewPass123!',
    user: {
      id: 'reviewer-employer-001',
      name: 'Demo Employer',
      email: 'reviewer_employer@test.com',
      status: 'ACTIVE',
      hasMpin: false,
      biometricEnabled: false,
    },
    membership: {
      id: 'reviewer-membership-employer-001',
      workplaceId: 'reviewer-workplace-001',
      workplaceName: 'Demo Workplace (Reviewer)',
      workplaceCode: 'REVIEW01',
      address: '123 Test Street, Demo City',
      timezone: 'Asia/Kolkata',
      role: 'EMPLOYER',
      status: 'ACTIVE',
      memberCount: 5,
      createdAt: new Date('2026-01-01').toISOString(),
    },
  },
  'reviewer_employee@test.com': {
    email: 'reviewer_employee@test.com',
    password: 'ReviewPass123!',
    user: {
      id: 'reviewer-employee-001',
      name: 'Demo Employee',
      email: 'reviewer_employee@test.com',
      status: 'ACTIVE',
      hasMpin: false,
      biometricEnabled: false,
    },
    membership: {
      id: 'reviewer-membership-employee-001',
      workplaceId: 'reviewer-workplace-001',
      workplaceName: 'Demo Workplace (Reviewer)',
      workplaceCode: 'REVIEW01',
      address: '123 Test Street, Demo City',
      timezone: 'Asia/Kolkata',
      role: 'EMPLOYEE',
      employeeCode: 'EMP-REVIEW-01',
      status: 'ACTIVE',
      createdAt: new Date('2026-01-01').toISOString(),
    },
  },
};

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import {
  REVIEWER_ACCESS_TOKEN,
  REVIEWER_REFRESH_TOKEN,
  REVIEWER_EMAIL_KEY,
  setActiveReviewerEmail,
} from './reviewerMockApi';

export { REVIEWER_ACCESS_TOKEN, REVIEWER_REFRESH_TOKEN };

/**
 * Returns an error string if credentials are invalid, otherwise null.
 */
export function validateReviewerCredentials(email: string, password: string): string | null {
  const normEmail = email.trim().toLowerCase();
  const normPass = password.trim();
  const account = REVIEWER_ACCOUNTS[normEmail];
  if (!account) return 'No reviewer account found for this email.';
  if (account.password !== normPass) return 'Incorrect password. Use: ReviewPass123!';
  return null;
}

/**
 * Bypasses all network/OAuth checks and logs directly into the reviewer account.
 * Installs a stable fake token so the session persists across app launches.
 */
export async function loginWithReviewerCredentials(email: string): Promise<void> {
  const normEmail = email.trim().toLowerCase();
  const account = REVIEWER_ACCOUNTS[normEmail];
  if (!account) throw new Error('Reviewer account not found.');

  invalidateSession();
  queryClient.clear();

  setActiveReviewerEmail(normEmail);
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(REVIEWER_EMAIL_KEY, normEmail);
    } else {
      await SecureStore.setItemAsync(REVIEWER_EMAIL_KEY, normEmail);
    }
  } catch {}

  setMemoryAccessToken(REVIEWER_ACCESS_TOKEN);
  await saveRefreshToken(REVIEWER_REFRESH_TOKEN);
  await clearStoredPendingPinApproval().catch(() => {});

  useAuthStore.setState({
    user: account.user,
    memberships: [account.membership],
    activeWorkplace: account.membership,
    isAuthenticated: true,
    isLoading: false,
    isWorkplaceConfirmed: true,
    pendingPinApproval: null,
    restorationError: null,
  });
  if (!account.user.hasMpin) {
    useLockStore.getState().setShouldPromptSetupAfterSignIn(true);
  }
}

/**
 * Called during initializeAuth to restore a reviewer session on app relaunch.
 * Returns the state slice to inject into the store, or null if not applicable.
 */
export async function getReviewerSessionByToken(): Promise<Record<string, unknown> | null> {
  let storedEmail: string | null = null;
  try {
    storedEmail = Platform.OS === 'web'
      ? localStorage.getItem(REVIEWER_EMAIL_KEY)
      : await SecureStore.getItemAsync(REVIEWER_EMAIL_KEY);
  } catch {}

  const emailToUse = (storedEmail && REVIEWER_ACCOUNTS[storedEmail])
    ? storedEmail
    : 'reviewer_employer@test.com';

  setActiveReviewerEmail(emailToUse);
  const account = REVIEWER_ACCOUNTS[emailToUse];
  if (!account) return null;
  return {
    user: account.user,
    memberships: [account.membership],
    activeWorkplace: account.membership,
    isAuthenticated: true,
    isWorkplaceConfirmed: true,
    pendingPinApproval: null,
  };
}

